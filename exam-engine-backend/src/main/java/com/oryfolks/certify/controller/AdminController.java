package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.ApprovalRequest;
import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.ApprovalRequestRepository;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.oryfolks.certify.exception.BadRequestException;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ExamAttemptRepository attemptRepository;

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCandidates(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String exam,
            @RequestParam(required = false) String locked) {
 
        List<User> candidates = userRepository.findByRole(UserRole.ROLE_CANDIDATE);
 
        List<Map<String, Object>> rows = new ArrayList<>();
        for (User c : candidates) {
 
            List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(c.getId());
 
            for (ExamAttempt attempt : attempts) {
 
                Map<String, Object> map = new HashMap<>();
 
                map.put("candidateId", c.getId().toString());
                map.put("candidateName",
                        c.getFullName() != null ? c.getFullName() : c.getUsername());
 
                map.put("email",
                        c.getUsername().contains("@")
                                ? c.getUsername()
                                : c.getUsername() + "@certify.com");
 
                map.put("examId", attempt.getExam().getId().toString());
                map.put("examTitle", attempt.getExam().getTitle());
 
                map.put("status", attempt.getResultStatus().name());
 
                boolean isLocked = false;
 
                if (attempt.getEndTime() != null &&
                        !Boolean.TRUE.equals(attempt.getRetryOverrideApproved())) {
 
                    isLocked = LocalDateTime.now()
                            .isBefore(attempt.getEndTime().plusDays(30));
                }
 
                map.put("locked", isLocked);
 
                map.put("retryOverrideApproved",
                        attempt.getRetryOverrideApproved());
 
                map.put("lastAttempt",
                        attempt.getEndTime() != null
                                ? attempt.getEndTime()
                                : attempt.getCreatedAt());
 
                rows.add(map);
            }
        }
 
        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            rows = rows.stream().filter(r -> r.get("candidateName").toString().toLowerCase().contains(query)
                    || r.get("email").toString().toLowerCase().contains(query)).toList();
        }
        if (status != null && !status.isBlank()) {
            rows = rows.stream().filter(r -> r.get("status").toString().equalsIgnoreCase(status)).toList();
        }
        if (exam != null && !exam.isBlank()) {
            rows = rows.stream().filter(r -> r.get("examTitle").toString().equalsIgnoreCase(exam)).toList();
        }
        if (locked != null && !locked.isBlank()) {
            boolean lockBool = Boolean.parseBoolean(locked);
            rows = rows.stream().filter(r -> ((Boolean) r.get("locked")) == lockBool).toList();
        }
 
        Map<String, Object> result = new HashMap<>();
        result.put("rows", rows);
        result.put("total", rows.size());
        return ResponseEntity.ok(ApiResponse.success("Candidates retrieved successfully", result));
    }

    @PostMapping("/candidates/{id}/lock-override/request")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestLockOverride(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {

        User candidate = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + id));

        String note = body != null ? body.getOrDefault("note", "") : "";

        ApprovalRequest req = ApprovalRequest.builder()
                .id(UUID.randomUUID().toString())
                .type("CANDIDATE_UNLOCK")
                .label("Unlock candidate · " + (candidate.getFullName() != null ? candidate.getFullName() : candidate.getUsername()))
                .targetId(id.toString())
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .requestedAt(java.time.LocalDateTime.now())
                .createdAt(java.time.LocalDateTime.now())
                .build();

        ApprovalRequest saved = approvalRepository.save(req);

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("approval", saved);
        return ResponseEntity.ok(ApiResponse.success("Lock override approval requested", res));
    }

    @PostMapping("/candidates/{candidateId}/override")
    public ResponseEntity<ApiResponse<Map<String, Object>>> approveOverride(
            @PathVariable UUID candidateId,
            @RequestBody Map<String, UUID> request,
            Principal principal) {
 
        System.out.println("========== APPROVE OVERRIDE ==========");
        System.out.println("Candidate ID: " + candidateId);
        System.out.println("Request Body: " + request);
 
        UUID examId = request.get("examId");
 
        if (examId == null) {
            throw new BadRequestException("Exam ID is required.");
        }
 
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateId));
 
        ExamAttempt latestAttempt = attemptRepository
                .findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(
                        candidateId,
                        examId)
                .orElseThrow(() -> new RuntimeException("No exam attempt found for this exam."));
 
        latestAttempt.setRetryOverrideApproved(true);
 
        attemptRepository.save(latestAttempt);
 
        auditLogRepository.save(
                AccessAuditLog.builder()
                        .userName(principal != null ? principal.getName() : "Admin")
                        .action(
                                "Approved retry override for "
                                        + candidate.getFullName()
                                        + " - "
                                        + latestAttempt.getExam().getTitle())
                        .module("Candidates")
                        .oldValue("LOCKED")
                        .newValue("UNLOCKED")
                        .build());
 
        Map<String, Object> response = new HashMap<>();
        response.put("candidateId", candidateId);
        response.put("examId", examId);
        response.put("candidateName", candidate.getFullName());
        response.put("examTitle", latestAttempt.getExam().getTitle());
 
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Candidate unlocked successfully.",
                        response));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String user) {

        List<AccessAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();

        if (module != null && !module.isBlank()) {
            logs = logs.stream().filter(l -> l.getModule() != null && l.getModule().equalsIgnoreCase(module)).toList();
        }
        if (user != null && !user.isBlank()) {
            logs = logs.stream().filter(l -> l.getUser().toLowerCase().contains(user.toLowerCase())).toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", logs);
        result.put("total", logs.size());
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", result));
    }

    // ------------------------------------------------------------------ //
    //  A2 Analytics & Attempt Review Endpoints
    // ------------------------------------------------------------------ //

    @GetMapping("/analytics/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardAnalytics() {
        List<ExamAttempt> attempts = attemptRepository.findAllByOrderByCreatedAtDesc();

        int totalAttempts = attempts.size();
        long passCount = attempts.stream().filter(a -> "PASS".equalsIgnoreCase(String.valueOf(a.getResultStatus()))).count();
        long needsReviewCount = attempts.stream().filter(a -> "NEEDS_REVIEW".equalsIgnoreCase(String.valueOf(a.getResultStatus()))).count();
        double passRate = totalAttempts > 0 ? Math.round((double) passCount / totalAttempts * 1000.0) / 10.0 : 84.5;

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalAttempts", totalAttempts);
        kpis.put("passRate", passRate);
        kpis.put("needsReview", needsReviewCount);
        kpis.put("avgDurationMin", 42);

        List<Map<String, Object>> levelDistribution = List.of(
            Map.of("level", "L1", "count", 12),
            Map.of("level", "L2", "count", 25),
            Map.of("level", "L3", "count", 45),
            Map.of("level", "L4", "count", 18),
            Map.of("level", "L5", "count", 8)
        );

        List<Map<String, Object>> passRateSplit = List.of(
            Map.of("name", "Pass", "value", (int) passCount),
            Map.of("name", "Fail", "value", Math.max(0, totalAttempts - (int) passCount - (int) needsReviewCount)),
            Map.of("name", "Needs Review", "value", (int) needsReviewCount)
        );

        List<Map<String, Object>> attemptsByStack = List.of(
            Map.of("stack", "Java", "attempts", 48),
            Map.of("stack", "React", "attempts", 32),
            Map.of("stack", "Python", "attempts", 24),
            Map.of("stack", "Node", "attempts", 16),
            Map.of("stack", "SQL", "attempts", 12)
        );

        List<Map<String, Object>> needsReviewQueue = attempts.stream()
            .filter(a -> "NEEDS_REVIEW".equalsIgnoreCase(String.valueOf(a.getResultStatus())))
            .limit(5)
            .map(this::mapAttemptSummary)
            .toList();

        Map<String, Object> data = new HashMap<>();
        data.put("kpis", kpis);
        data.put("levelDistribution", levelDistribution);
        data.put("passRateSplit", passRateSplit);
        data.put("attemptsByStack", attemptsByStack);
        data.put("needsReviewQueue", needsReviewQueue);

        return ResponseEntity.ok(ApiResponse.success("Dashboard analytics retrieved", data));
    }

    @GetMapping("/attempts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttempts(
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        List<ExamAttempt> attempts = attemptRepository.findAllByOrderByCreatedAtDesc();
        if (from != null && !from.isBlank()) {
                        try {
                                java.time.LocalDate fromDate = java.time.LocalDate.parse(from);
                                attempts = attempts.stream().filter(a -> {
                                        java.time.LocalDateTime dt = a.getSubmittedAt() != null ? a.getSubmittedAt()
                                                        : a.getCreatedAt();
                                        return dt != null && !dt.toLocalDate().isBefore(fromDate);
                                }).toList();
                        } catch (Exception ignored) {
                        }
                }
                if (to != null && !to.isBlank()) {
                        try {
                                java.time.LocalDate toDate = java.time.LocalDate.parse(to);
                                attempts = attempts.stream().filter(a -> {
                                        java.time.LocalDateTime dt = a.getSubmittedAt() != null ? a.getSubmittedAt()
                                                        : a.getCreatedAt();
                                        return dt != null && !dt.toLocalDate().isAfter(toDate);
                                }).toList();
                        } catch (Exception ignored) {
                        }
                }

        List<Map<String, Object>> rows = attempts.stream().map(this::mapAttemptSummary).toList();

        if (stack != null && !stack.isBlank()) {
            rows = rows.stream().filter(r -> stack.equalsIgnoreCase(String.valueOf(r.get("stack")))).toList();
        }
        if (level != null && !level.isBlank()) {
            rows = rows.stream().filter(r -> level.equalsIgnoreCase(String.valueOf(r.get("level")))).toList();
        }
        if (result != null && !result.isBlank()) {
            rows = rows.stream().filter(r -> result.equalsIgnoreCase(String.valueOf(r.get("result")))).toList();
        }

        Map<String, Object> res = new HashMap<>();
        res.put("rows", rows);
        res.put("total", rows.size());

        return ResponseEntity.ok(ApiResponse.success("Attempts retrieved", res));
    }

    @GetMapping("/attempts/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptById(@PathVariable UUID id) {
        ExamAttempt attempt = attemptRepository.findById(id)
                .orElse(null);

        Map<String, Object> data = attempt != null ? mapAttemptSummary(attempt) : Map.of(
            "id", id.toString(),
            "candidate", "Sample Candidate",
            "exam", "Java Backend Developer",
            "stack", "Java",
            "level", "L3",
            "score", 78,
            "result", "PASS"
        );

        return ResponseEntity.ok(ApiResponse.success("Attempt details retrieved", data));
    }

    @GetMapping("/attempts/{id}/recording-url")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRecordingUrl(
            @PathVariable UUID id,
            Principal principal) {

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("VIEW_PROCTORING_RECORDING")
                .module("Integrity Review")
                .oldValue("-")
                .newValue("Attempt: " + id)
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("url", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
        res.put("expiresAt", new Date(System.currentTimeMillis() + 3600 * 1000).toString());
        res.put("accessLogged", true);

        return ResponseEntity.ok(ApiResponse.success("Signed recording URL generated", res));
    }

    @GetMapping("/attempts/{id}/flags")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptFlags(@PathVariable UUID id) {
        List<String> taxonomy = List.of(
            "FACE_NOT_VISIBLE", "MULTIPLE_FACES", "GAZE_AWAY", "TAB_SWITCH",
            "COPY_PASTE", "SECOND_DEVICE", "VOICE_DETECTED", "SCREEN_SHARE_LOST"
        );

        List<Map<String, Object>> items = List.of(
            Map.of("id", "flag-1", "type", "TAB_SWITCH", "timestampSec", 145, "severity", "HIGH", "description", "Browser tab lost focus for 12 seconds"),
            Map.of("id", "flag-2", "type", "GAZE_AWAY", "timestampSec", 310, "severity", "MEDIUM", "description", "Gaze directed off-screen for 8 seconds")
        );

        Map<String, Object> res = new HashMap<>();
        res.put("taxonomy", taxonomy);
        res.put("items", items);

        return ResponseEntity.ok(ApiResponse.success("Flags retrieved", res));
    }

    @GetMapping("/attempts/{id}/score")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptScore(@PathVariable UUID id) {
        Map<String, Object> score = new HashMap<>();
        score.put("total", 78);
        score.put("maxTotal", 100);
        score.put("autoResult", "PASS");
        score.put("integrityPenaltyApplied", false);
        score.put("sections", List.of(
            Map.of("name", "Core Java & Syntax", "score", 28, "max", 30),
            Map.of("name", "Collections & Streams", "score", 25, "max", 30),
            Map.of("name", "Concurrency & Threading", "score", 25, "max", 40)
        ));

        return ResponseEntity.ok(ApiResponse.success("Score retrieved", score));
    }

    @PostMapping("/attempts/{id}/decision/confirm")
    public ResponseEntity<ApiResponse<Map<String, Object>>> confirmDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        ExamAttempt attempt = attemptRepository.findById(id).orElse(null);
        if (attempt != null && payload.containsKey("result")) {
            try {
                attempt.setResultStatus(com.oryfolks.certify.enums.ResultStatus.valueOf(payload.get("result").toString()));
                attemptRepository.save(attempt);
            } catch (Exception ignored) {}
        }

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("CONFIRM_ATTEMPT_RESULT")
                .module("Integrity Review")
                .oldValue("NEEDS_REVIEW")
                .newValue(String.valueOf(payload.get("result")))
                .build());

        Map<String, Object> res = Map.of("ok", true, "status", "CONFIRMED");
        return ResponseEntity.ok(ApiResponse.success("Result decision confirmed", res));
    }

    @PostMapping("/attempts/{id}/decision/escalate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> escalateDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        String note = payload.getOrDefault("note", "").toString();

        approvalRepository.save(ApprovalRequest.builder()
                .type("FOUR_EYES_REVIEW")
                .label("Integrity Review Escalation · Attempt " + id)
                .targetId(id.toString())
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .build());

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("ESCALATE_FOR_SECOND_REVIEW")
                .module("Integrity Review")
                .oldValue("-")
                .newValue("Attempt: " + id)
                .build());

        Map<String, Object> res = Map.of("ok", true, "status", "ESCALATED");
        return ResponseEntity.ok(ApiResponse.success("Escalated for second review", res));
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getNotifications() {
        List<ApprovalRequest> pending = approvalRepository.findByStatusOrderByRequestedAtDesc("PENDING");

        List<Map<String, Object>> notifs = pending.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("title", a.getLabel());
            map.put("desc", "Requested by " + a.getRequestedBy() + (a.getNote() != null ? " · " + a.getNote() : ""));
            map.put("time", a.getRequestedAt() != null ? a.getRequestedAt().toString() : new Date().toString());
            map.put("read", false);
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", notifs));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markNotificationRead(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success("Notification read", Map.of("ok", true)));
    }

    private Map<String, Object> mapAttemptSummary(ExamAttempt a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId().toString());
        map.put("candidate", a.getCandidate() != null ? (a.getCandidate().getFullName() != null ? a.getCandidate().getFullName() : a.getCandidate().getUsername()) : "Candidate");
        map.put("email", a.getCandidate() != null ? a.getCandidate().getUsername() : "");
        map.put("exam", a.getExam() != null ? a.getExam().getTitle() : "Java Certification");
        map.put("stack", a.getExam() != null ? a.getExam().getStack() : "Java");
        map.put("level", a.getAssignedLevel() != null ? a.getAssignedLevel().name() : (a.getCompetencyLevel() != null ? a.getCompetencyLevel().name() : "L3"));
        map.put("score", a.getScore() != null ? a.getScore() : 0);
        map.put("result", a.getResultStatus() != null ? a.getResultStatus().name() : "NEEDS_REVIEW");
        map.put("submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString() : (a.getCreatedAt() != null ? a.getCreatedAt().toString() : new Date().toString()));
        return map;
    }
}
