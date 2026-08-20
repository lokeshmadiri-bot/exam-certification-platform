package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.ApprovalRequest;
import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.ApprovalRequestRepository;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.repository.CompetencyBandRepository;
import com.oryfolks.certify.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.oryfolks.certify.exception.BadRequestException;
import com.oryfolks.certify.entity.ExamAttemptQuestion;
import com.oryfolks.certify.repository.ExamAttemptQuestionRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.repository.AttemptAnswerRepository;
import com.oryfolks.certify.repository.AnswerRepository;
import com.oryfolks.certify.repository.SectionRepository;
import com.oryfolks.certify.repository.IntegrityViolationRepository;
import com.oryfolks.certify.repository.ExamViolationRepository;
import com.oryfolks.certify.repository.AIFlagRepository;
import com.oryfolks.certify.repository.RecordingSessionRepository;
import com.oryfolks.certify.entity.AttemptAnswer;
import com.oryfolks.certify.entity.Answer;
import com.oryfolks.certify.entity.Section;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.entity.IntegrityViolation;
import com.oryfolks.certify.entity.ExamViolation;
import com.oryfolks.certify.entity.AIFlag;
import com.oryfolks.certify.entity.RecordingSession;
import com.oryfolks.certify.enums.ResultPublishStatus;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.enums.CompetencyLevel;
import org.springframework.beans.factory.annotation.Value;

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

    @Autowired
    private CompetencyBandRepository competencyBandRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private AttemptAnswerRepository attemptAnswerRepository;

    @Autowired
    private AnswerRepository answerRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private IntegrityViolationRepository integrityViolationRepository;

    @Autowired
    private AIFlagRepository aiFlagRepository;

    @Autowired
    private ExamViolationRepository examViolationRepository;

    @Autowired
    private RecordingSessionRepository recordingSessionRepository;

    @Autowired
    private ExamAttemptQuestionRepository examAttemptQuestionRepository;

    @Value("${app.retry-lock-duration-days:30}")
    private int retryLockDurationDays;

    @Value("${app.override-lock-duration-days:7}")
    private int overrideLockDurationDays;

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCandidates(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String exam,
            @RequestParam(required = false) String locked) {

        List<User> candidates = userRepository.findByRole(UserRole.ROLE_CANDIDATE);
        List<Exam> activeExams = examRepository.findByStatus(ExamStatus.ACTIVE);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (User c : candidates) {
            List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(c.getId());
            if (activeExams.isEmpty() && attempts.isEmpty()) {
                Map<String, Object> map = new HashMap<>();
                map.put("candidateId", c.getId().toString());
                map.put("candidateName", c.getFullName() != null ? c.getFullName() : c.getUsername());
                map.put("email", c.getUsername().contains("@") ? c.getUsername() : c.getUsername() + "@certify.com");
                map.put("examId", "");
                map.put("examTitle", "—");
                map.put("status", "NOT_STARTED");
                map.put("statusLabel", "Not Started");
                map.put("locked", false);
                map.put("overrideLockStatus", "UNLOCKED");
                map.put("retryOverrideApproved", false);
                map.put("lastAttempt", null);
                map.put("startTime", null);
                map.put("endTime", null);
                map.put("durationMinutes", null);
                map.put("attemptId", null);
                map.put("questionCount", 0);
                rows.add(map);
            } else {
                for (Exam activeExam : activeExams) {
                    Optional<ExamAttempt> latestAttempt = attempts.stream()
                            .filter(a -> a.getExam() != null && a.getExam().getId().equals(activeExam.getId()))
                            .findFirst();

                    if (latestAttempt.isPresent()) {
                        ExamAttempt attempt = latestAttempt.get();
                        Map<String, Object> map = new HashMap<>();
                        map.put("candidateId", c.getId().toString());
                        map.put("attemptId", attempt.getId().toString());
                        map.put("candidateName", c.getFullName() != null ? c.getFullName() : c.getUsername());
                        map.put("email", c.getUsername().contains("@") ? c.getUsername() : c.getUsername() + "@certify.com");
                        map.put("examId", attempt.getExam().getId().toString());
                        map.put("examTitle", attempt.getExam().getTitle());
                        String statusName = attempt.getResultStatus() != null ? attempt.getResultStatus().name() : "NOT_STARTED";
                        map.put("status", statusName);
                        String statusLabel;
                        switch (statusName) {
                            case "IN_PROGRESS": statusLabel = "In Progress"; break;
                            case "SUBMITTED":   statusLabel = "Submitted"; break;
                            case "PASSED":      statusLabel = "Passed"; break;
                            case "FAILED":      statusLabel = "Failed"; break;
                            case "TERMINATED":  statusLabel = "Terminated"; break;
                            default:            statusLabel = statusName; break;
                        }
                        map.put("statusLabel", statusLabel);
                        boolean isLocked = false;
                        if (attempt.getEndTime() != null) {
                            isLocked = LocalDateTime.now().isBefore(attempt.getEndTime().plusDays(retryLockDurationDays));
                        }
                        boolean overrideActive = false;
                        String targetKey = c.getId().toString();
                        if (attempt.getExam() != null) {
                            targetKey = c.getId().toString() + ":" + attempt.getExam().getId().toString();
                        }
                        Optional<ApprovalRequest> approvalOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                "CANDIDATE_UNLOCK", targetKey, "APPROVED"
                        );
                        if (!approvalOpt.isPresent()) {
                            approvalOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                    "CANDIDATE_UNLOCK", c.getId().toString(), "APPROVED"
                            );
                        }
                        if (approvalOpt.isPresent()) {
                            ApprovalRequest req = approvalOpt.get();
                            LocalDateTime approvedAt = req.getResolvedAt();
                            if (approvedAt != null) {
                                LocalDateTime expiresAt = approvedAt.plusDays(overrideLockDurationDays);
                                if (!LocalDateTime.now().isAfter(expiresAt)) {
                                    // Check if this latest attempt was started AFTER the override approval was resolved
                                    LocalDateTime attemptTime = attempt.getCreatedAt();
                                    if (attemptTime == null) {
                                        attemptTime = attempt.getStartTime();
                                    }
                                    if (attemptTime == null || !attemptTime.isAfter(approvedAt)) {
                                        overrideActive = true;
                                    }
                                }
                            }
                        }
                        map.put("locked", isLocked && !overrideActive);
                        map.put("overrideLockStatus", overrideActive
                                ? "OVERRIDE_APPROVED" : (isLocked ? "LOCKED" : "UNLOCKED"));
                        map.put("retryOverrideApproved", overrideActive);
                        map.put("lastAttempt", attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getCreatedAt());
                        map.put("startTime", attempt.getStartTime());
                        map.put("endTime", attempt.getEndTime());
                        map.put("durationMinutes", attempt.getExam().getDurationMinutes());
                        long qCount = attemptAnswerRepository.countByAttemptId(attempt.getId());
                        map.put("questionCount", qCount);
                        rows.add(map);
                    } else {
                        Map<String, Object> map = new HashMap<>();
                        map.put("candidateId", c.getId().toString());
                        map.put("attemptId", null);
                        map.put("candidateName", c.getFullName() != null ? c.getFullName() : c.getUsername());
                        map.put("email", c.getUsername().contains("@") ? c.getUsername() : c.getUsername() + "@certify.com");
                        map.put("examId", activeExam.getId().toString());
                        map.put("examTitle", activeExam.getTitle());
                        map.put("status", "NOT_STARTED");
                        map.put("statusLabel", "Not Started");
                        map.put("locked", false);
                        map.put("overrideLockStatus", "UNLOCKED");
                        map.put("retryOverrideApproved", false);
                        map.put("lastAttempt", null);
                        map.put("startTime", null);
                        map.put("endTime", null);
                        map.put("durationMinutes", activeExam.getDurationMinutes());
                        map.put("questionCount", 0);
                        rows.add(map);
                    }
                }
                for (ExamAttempt attempt : attempts) {
                    boolean alreadyShown = activeExams.stream()
                            .anyMatch(ae -> ae.getId().equals(attempt.getExam().getId()));
                    if (!alreadyShown && attempt.getExam() != null) {
                        Map<String, Object> map = new HashMap<>();
                        map.put("candidateId", c.getId().toString());
                        map.put("attemptId", attempt.getId().toString());
                        map.put("candidateName", c.getFullName() != null ? c.getFullName() : c.getUsername());
                        map.put("email", c.getUsername().contains("@") ? c.getUsername() : c.getUsername() + "@certify.com");
                        map.put("examId", attempt.getExam().getId().toString());
                        map.put("examTitle", attempt.getExam().getTitle() + " (Inactive)");
                        String statusName = attempt.getResultStatus() != null ? attempt.getResultStatus().name() : "NOT_STARTED";
                        map.put("status", statusName);
                        String statusLabel;
                        switch (statusName) {
                            case "IN_PROGRESS": statusLabel = "In Progress"; break;
                            case "SUBMITTED":   statusLabel = "Submitted"; break;
                            case "PASSED":      statusLabel = "Passed"; break;
                            case "FAILED":      statusLabel = "Failed"; break;
                            case "TERMINATED":  statusLabel = "Terminated"; break;
                            default:            statusLabel = statusName; break;
                        }
                        map.put("statusLabel", statusLabel);
                        boolean isLocked = false;
                        if (attempt.getEndTime() != null) {
                            isLocked = LocalDateTime.now().isBefore(attempt.getEndTime().plusDays(retryLockDurationDays));
                        }
                        boolean overrideActive = false;
                        String targetKey2 = c.getId().toString();
                        if (attempt.getExam() != null) {
                            targetKey2 = c.getId().toString() + ":" + attempt.getExam().getId().toString();
                        }
                        Optional<ApprovalRequest> approvalOpt2 = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                "CANDIDATE_UNLOCK", targetKey2, "APPROVED"
                        );
                        if (!approvalOpt2.isPresent()) {
                            approvalOpt2 = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                    "CANDIDATE_UNLOCK", c.getId().toString(), "APPROVED"
                            );
                        }
                        if (approvalOpt2.isPresent()) {
                            ApprovalRequest req = approvalOpt2.get();
                            LocalDateTime approvedAt = req.getResolvedAt();
                            if (approvedAt != null) {
                                LocalDateTime expiresAt = approvedAt.plusDays(overrideLockDurationDays);
                                if (!LocalDateTime.now().isAfter(expiresAt)) {
                                    // Check if this latest attempt was started AFTER the override approval was resolved
                                    LocalDateTime attemptTime = attempt.getCreatedAt();
                                    if (attemptTime == null) {
                                        attemptTime = attempt.getStartTime();
                                    }
                                    if (attemptTime == null || !attemptTime.isAfter(approvedAt)) {
                                        overrideActive = true;
                                    }
                                }
                            }
                        }
                        map.put("locked", isLocked && !overrideActive);
                        map.put("overrideLockStatus", overrideActive
                                ? "OVERRIDE_APPROVED" : (isLocked ? "LOCKED" : "UNLOCKED"));
                        map.put("retryOverrideApproved", overrideActive);
                        map.put("lastAttempt", attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getCreatedAt());
                        map.put("startTime", attempt.getStartTime());
                        map.put("endTime", attempt.getEndTime());
                        map.put("durationMinutes", attempt.getExam().getDurationMinutes());
                        long qCount = attemptAnswerRepository.countByAttemptId(attempt.getId());
                        map.put("questionCount", qCount);
                        rows.add(map);
                    }
                }
            }
        }

        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            rows = rows.stream().filter(r -> r.get("candidateName") != null && r.get("candidateName").toString().toLowerCase().contains(query)
                    || (r.get("email") != null && r.get("email").toString().toLowerCase().contains(query))).toList();
        }
        if (status != null && !status.isBlank()) {
            if ("COMPLETED".equalsIgnoreCase(status)) {
                rows = rows.stream().filter(r -> {
                    String s = r.get("status") != null ? r.get("status").toString() : "";
                    return "PASSED".equalsIgnoreCase(s) || "FAILED".equalsIgnoreCase(s) || "TERMINATED".equalsIgnoreCase(s) || "SUBMITTED".equalsIgnoreCase(s);
                }).toList();
            } else {
                rows = rows.stream().filter(r -> r.get("status") != null && r.get("status").toString().equalsIgnoreCase(status)).toList();
            }
        }
        if (exam != null && !exam.isBlank()) {
            rows = rows.stream().filter(r -> r.get("examTitle") != null && r.get("examTitle").toString().toLowerCase().contains(exam.toLowerCase())).toList();
        }
        if (locked != null && !locked.isBlank()) {
            boolean lockBool = Boolean.parseBoolean(locked);
            rows = rows.stream().filter(r -> Boolean.TRUE.equals(r.get("locked")) == lockBool).toList();
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

        String examId = body != null ? body.get("examId") : null;
        String targetId = id.toString();
        if (examId != null && !examId.trim().isEmpty()) {
            targetId = id.toString() + ":" + examId.trim();
        }

        if (approvalRepository.findFirstByTargetIdAndStatus(targetId, "PENDING").isPresent()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("An unlock approval request is already pending for this candidate."));
        }

        String note = body != null ? body.getOrDefault("note", "") : "";

        ApprovalRequest req = ApprovalRequest.builder()
                .id(UUID.randomUUID().toString())
                .type("CANDIDATE_UNLOCK")
                .label("Unlock candidate · " + (candidate.getFullName() != null ? candidate.getFullName() : candidate.getUsername()))
                .targetId(targetId)
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

        UUID examId = request.get("examId");

        if (examId == null) {
            throw new BadRequestException("Exam ID is required.");
        }

        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateId));

        ExamAttempt latestAttempt = attemptRepository
                .findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(candidateId, examId)
                .orElseThrow(() -> new RuntimeException("No exam attempt found for this exam."));

        latestAttempt.setRetryOverrideApproved(true);
        attemptRepository.save(latestAttempt);

        // Record approved CANDIDATE_UNLOCK request to establish the validity timeline
        Optional<ApprovalRequest> pendingOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatus(
                "CANDIDATE_UNLOCK", candidateId.toString() + ":" + examId.toString(), "PENDING"
        );
        if (!pendingOpt.isPresent()) {
            pendingOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatus(
                    "CANDIDATE_UNLOCK", candidateId.toString(), "PENDING"
            );
        }
        if (pendingOpt.isPresent()) {
            ApprovalRequest pending = pendingOpt.get();
            pending.setStatus("APPROVED");
            pending.setTargetId(candidateId.toString() + ":" + examId.toString());
            pending.setResolvedBy(principal != null ? principal.getName() : "Admin");
            pending.setResolvedAt(LocalDateTime.now());
            approvalRepository.save(pending);
        } else {
            ApprovalRequest req = ApprovalRequest.builder()
                    .id(UUID.randomUUID().toString())
                    .type("CANDIDATE_UNLOCK")
                    .label("Unlock candidate · " + (candidate.getFullName() != null ? candidate.getFullName() : candidate.getUsername()))
                    .targetId(candidateId.toString() + ":" + examId.toString())
                    .requestedBy(principal != null ? principal.getName() : "Admin")
                    .status("APPROVED")
                    .requestedAt(LocalDateTime.now())
                    .resolvedAt(LocalDateTime.now())
                    .resolvedBy(principal != null ? principal.getName() : "Admin")
                    .createdAt(LocalDateTime.now())
                    .build();
            approvalRepository.save(req);
        }

        auditLogRepository.save(
                AccessAuditLog.builder()
                        .userName(principal != null ? principal.getName() : "Admin")
                        .action("Approved retry override for " + candidate.getFullName() + " - " + (latestAttempt.getExam() != null ? latestAttempt.getExam().getTitle() : ""))
                        .module("Candidates")
                        .oldValue("LOCKED")
                        .newValue("UNLOCKED")
                        .build());

        Map<String, Object> response = new HashMap<>();
        response.put("candidateId", candidateId);
        response.put("examId", examId);
        response.put("candidateName", candidate.getFullName());
        response.put("examTitle", latestAttempt.getExam() != null ? latestAttempt.getExam().getTitle() : "");

        return ResponseEntity.ok(ApiResponse.success("Candidate unlocked successfully.", response));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLogs(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String user) {

        List<AccessAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();

        if (module != null && !module.isBlank()) {
            logs = logs.stream()
                    .filter(l -> l.getModule() != null && l.getModule().equalsIgnoreCase(module))
                    .toList();
        }
        if (user != null && !user.isBlank()) {
            logs = logs.stream().filter(l -> l.getUser() != null && l.getUser().toLowerCase().contains(user.toLowerCase()))
                    .toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", logs);
        result.put("total", logs.size());
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", result));
    }

    // ------------------------------------------------------------------ //
    // A2 Analytics & Attempt Review Endpoints
    // ------------------------------------------------------------------ //

    @GetMapping("/analytics/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardAnalytics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String startMonth,
            @RequestParam(required = false) String endMonth,
            @RequestParam(required = false) String month) {
        try {
            List<ExamAttempt> attempts;
            try {
                attempts = attemptRepository != null ? attemptRepository.findAllByOrderByCreatedAtDesc() : List.of();
            } catch (Exception e) {
                try {
                    attempts = attemptRepository != null ? attemptRepository.findAll() : List.of();
                } catch (Exception ex) {
                    attempts = new ArrayList<>();
                }
            }
            if (attempts == null) attempts = new ArrayList<>();

            LocalDateTime startDateTime = null;
            LocalDateTime endDateTime = null;

            if (startDate != null && !startDate.isBlank()) {
                try {
                    startDateTime = java.time.LocalDate.parse(startDate).atStartOfDay();
                } catch (Exception ignored) {}
            }
            if (endDate != null && !endDate.isBlank()) {
                try {
                    endDateTime = java.time.LocalDate.parse(endDate).atTime(23, 59, 59, 999999999);
                } catch (Exception ignored) {}
            }

            if (startMonth != null && !startMonth.isBlank()) {
                try {
                    startDateTime = java.time.YearMonth.parse(startMonth).atDay(1).atStartOfDay();
                } catch (Exception ignored) {}
            }
            if (endMonth != null && !endMonth.isBlank()) {
                try {
                    endDateTime = java.time.YearMonth.parse(endMonth).atEndOfMonth().atTime(23, 59, 59, 999999999);
                } catch (Exception ignored) {}
            }

            // Fallback for monthly filter if not provided yet
            if (startDateTime == null && endDateTime == null && month != null && !month.isBlank()) {
                try {
                    String[] parts = month.split("-");
                    int year = Integer.parseInt(parts[0]);
                    int mVal = Integer.parseInt(parts[1]);
                    java.time.YearMonth ym = java.time.YearMonth.of(year, mVal);
                    startDateTime = ym.atDay(1).atStartOfDay();
                    endDateTime = ym.atEndOfMonth().atTime(23, 59, 59, 999999999);
                } catch (Exception ignored) {}
            }

            // Default to CURRENT MONTH boundaries if no filter is active
            if (startDateTime == null && endDateTime == null) {
                java.time.YearMonth currentYM = java.time.YearMonth.now();
                startDateTime = currentYM.atDay(1).atStartOfDay();
                endDateTime = currentYM.atEndOfMonth().atTime(23, 59, 59, 999999999);
            }

            final LocalDateTime finalStart = startDateTime;
            final LocalDateTime finalEnd = endDateTime;

            List<ExamAttempt> filteredAttempts = new ArrayList<>();
            for (ExamAttempt a : attempts) {
                if (a == null) continue;
                LocalDateTime time = a.getCreatedAt() != null ? a.getCreatedAt() : a.getStartTime();
                if (time == null) continue;
                if (finalStart != null && time.isBefore(finalStart)) continue;
                if (finalEnd != null && time.isAfter(finalEnd)) continue;
                filteredAttempts.add(a);
            }

            int totalAttempts = filteredAttempts.size();
            long passCount = 0;
            long failCount = 0;
            long needsReviewCount = 0;

            for (ExamAttempt a : filteredAttempts) {
                String decision = a.getAdminDecision();
                if ("CONFIRMED".equals(decision)) {
                    if (a.getResultStatus() == ResultStatus.PASSED) {
                        passCount++;
                    } else {
                        failCount++;
                    }
                } else if ("REJECTED".equals(decision)) {
                    failCount++;
                } else {
                    needsReviewCount++;
                }
            }

            double passRate = totalAttempts > 0 ? Math.round((double) passCount / totalAttempts * 1000.0) / 10.0 : 0.0;

            Map<String, Object> kpis = new HashMap<>();
            kpis.put("totalAttempts", totalAttempts);
            kpis.put("passRate", passRate);
            kpis.put("needsReview", needsReviewCount);
            kpis.put("avgDurationMin", 42);

            Map<String, Integer> levelCounts = new HashMap<>();
            levelCounts.put("L1", 0);
            levelCounts.put("L2", 0);
            levelCounts.put("L3", 0);
            levelCounts.put("L4", 0);
            levelCounts.put("L5", 0);

            for (ExamAttempt a : filteredAttempts) {
                String decision = a.getAdminDecision();
                if ("CONFIRMED".equals(decision) && a.getResultStatus() == ResultStatus.PASSED) {
                    String lvl = a.getAssignedLevel() != null ? a.getAssignedLevel().name()
                            : (a.getCompetencyLevel() != null ? a.getCompetencyLevel().name() : null);
                    if (lvl != null && levelCounts.containsKey(lvl)) {
                        levelCounts.put(lvl, levelCounts.get(lvl) + 1);
                    }
                }
            }

            List<Map<String, Object>> levelDistribution = List.of(
                    Map.of("level", "L1", "count", levelCounts.get("L1")),
                    Map.of("level", "L2", "count", levelCounts.get("L2")),
                    Map.of("level", "L3", "count", levelCounts.get("L3")),
                    Map.of("level", "L4", "count", levelCounts.get("L4")),
                    Map.of("level", "L5", "count", levelCounts.get("L5")));

            List<Map<String, Object>> passRateSplit = List.of(
                    Map.of("name", "Pass", "value", (int) passCount),
                    Map.of("name", "Fail", "value", (int) failCount),
                    Map.of("name", "Needs Review", "value", (int) needsReviewCount));

            // Dynamically calculate attemptsByStack (pass/fail count for each stack)
            Set<String> allStacks = new LinkedHashSet<>(List.of("Java", "React", "Python", "Node", "SQL"));
            if (examRepository != null) {
                examRepository.findAll().forEach(e -> {
                    if (e != null && e.getStack() != null && !e.getStack().isBlank()) {
                        String stackName = e.getStack().trim();
                        boolean found = false;
                        for (String existing : allStacks) {
                            if (existing.equalsIgnoreCase(stackName)) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            allStacks.add(stackName);
                        }
                    }
                });
            }
            for (ExamAttempt a : filteredAttempts) {
                if (a != null && a.getExam() != null && a.getExam().getStack() != null && !a.getExam().getStack().isBlank()) {
                    String stackName = a.getExam().getStack().trim();
                    boolean found = false;
                    for (String existing : allStacks) {
                        if (existing.equalsIgnoreCase(stackName)) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        allStacks.add(stackName);
                    }
                }
            }

            Map<String, Map<String, Integer>> stackStats = new LinkedHashMap<>();
            for (String s : allStacks) {
                Map<String, Integer> stats = new HashMap<>();
                stats.put("pass", 0);
                stats.put("fail", 0);
                stackStats.put(s, stats);
            }

            for (ExamAttempt a : filteredAttempts) {
                if (a == null || a.getExam() == null || a.getExam().getStack() == null || a.getExam().getStack().isBlank()) {
                    continue;
                }
                String sName = a.getExam().getStack().trim();
                String matchedKey = sName;
                for (String key : stackStats.keySet()) {
                    if (key.equalsIgnoreCase(sName)) {
                        matchedKey = key;
                        break;
                    }
                }
                stackStats.putIfAbsent(matchedKey, new HashMap<>(Map.of("pass", 0, "fail", 0)));
                Map<String, Integer> stats = stackStats.get(matchedKey);

                String decision = a.getAdminDecision();
                if ("CONFIRMED".equals(decision)) {
                    if (a.getResultStatus() == ResultStatus.PASSED) {
                        stats.put("pass", stats.get("pass") + 1);
                    } else {
                        stats.put("fail", stats.get("fail") + 1);
                    }
                } else if ("REJECTED".equals(decision)) {
                    stats.put("fail", stats.get("fail") + 1);
                }
            }

            List<Map<String, Object>> attemptsByStack = new ArrayList<>();
            for (Map.Entry<String, Map<String, Integer>> entry : stackStats.entrySet()) {
                attemptsByStack.add(Map.of(
                        "stack", entry.getKey(),
                        "pass", entry.getValue().get("pass"),
                        "fail", entry.getValue().get("fail")
                ));
            }
            if (attemptsByStack.isEmpty()) {
                attemptsByStack = List.of(
                        Map.of("stack", "Java", "pass", 0, "fail", 0),
                        Map.of("stack", "React", "pass", 0, "fail", 0),
                        Map.of("stack", "Python", "pass", 0, "fail", 0),
                        Map.of("stack", "Node", "pass", 0, "fail", 0),
                        Map.of("stack", "SQL", "pass", 0, "fail", 0));
            }

            List<Map<String, Object>> needsReviewQueue = new ArrayList<>();
            for (ExamAttempt a : filteredAttempts) {
                if (a != null) {
                    try {
                        Map<String, Object> summary = mapAttemptSummary(a);
                        String r = String.valueOf(summary.get("result"));
                        if ("NEEDS_REVIEW".equalsIgnoreCase(r) || "IN_PROGRESS".equalsIgnoreCase(r)) {
                            needsReviewQueue.add(summary);
                        }
                    } catch (Exception ignored) {}
                }
                if (needsReviewQueue.size() >= 10) break;
            }

            Map<String, Object> data = new HashMap<>();
            data.put("kpis", kpis);
            data.put("levelDistribution", levelDistribution);
            data.put("startDate", startDate);
            data.put("endDate", endDate);
            data.put("startMonth", startDateTime != null ? startDateTime.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")) : null);
            data.put("endMonth", endDateTime != null ? endDateTime.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")) : null);
            data.put("levelMonth", month != null ? month : (startDate != null && startDate.length() >= 7 ? startDate.substring(0, 7) : java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM"))));
            data.put("passRateSplit", passRateSplit);
            data.put("attemptsByStack", attemptsByStack);
            data.put("needsReviewQueue", needsReviewQueue);

            return ResponseEntity.ok(ApiResponse.success("Dashboard analytics retrieved", data));
        } catch (Exception e) {
            System.err.println("Dashboard error: " + e.getMessage());
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("kpis", Map.of("totalAttempts", 0, "passRate", 0, "needsReview", 0, "avgDurationMin", 0));
            fallback.put("levelDistribution", List.of());
            fallback.put("startDate", startDate);
            fallback.put("endDate", endDate);
            fallback.put("levelMonth", java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")));
            fallback.put("passRateSplit", List.of());
            fallback.put("attemptsByStack", List.of());
            fallback.put("needsReviewQueue", List.of());
            return ResponseEntity.ok(ApiResponse.success("Dashboard analytics retrieved (fallback)", fallback));
        }
    }

    @GetMapping("/attempts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttempts(
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false, defaultValue = "false") boolean reviewOnly) {

        return fetchAttemptsInternal(stack, level, result, from, to, reviewOnly);
    }

    @GetMapping("/attempts/review")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReviewAttempts(
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        return fetchAttemptsInternal(stack, level, result, from, to, true);
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> fetchAttemptsInternal(
            String stack, String level, String result, String from, String to, boolean reviewOnly) {
        try {
            List<ExamAttempt> attempts;
            try {
                attempts = attemptRepository != null ? attemptRepository.findAllByOrderByCreatedAtDesc() : List.of();
            } catch (Exception e) {
                try {
                    attempts = attemptRepository != null ? attemptRepository.findAll() : List.of();
                } catch (Exception ex) {
                    attempts = new ArrayList<>();
                }
            }
            if (attempts == null) attempts = new ArrayList<>();

            if (from != null && !from.isBlank()) {
                try {
                    java.time.LocalDate fromDate = java.time.LocalDate.parse(from);
                    attempts = attempts.stream().filter(a -> {
                        java.time.LocalDateTime dt = a != null ? (a.getSubmittedAt() != null ? a.getSubmittedAt() : a.getCreatedAt()) : null;
                        return dt != null && !dt.toLocalDate().isBefore(fromDate);
                    }).toList();
                } catch (Exception ignored) {}
            }
            if (to != null && !to.isBlank()) {
                try {
                    java.time.LocalDate toDate = java.time.LocalDate.parse(to);
                    attempts = attempts.stream().filter(a -> {
                        java.time.LocalDateTime dt = a != null ? (a.getSubmittedAt() != null ? a.getSubmittedAt() : a.getCreatedAt()) : null;
                        return dt != null && !dt.toLocalDate().isAfter(toDate);
                    }).toList();
                } catch (Exception ignored) {}
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            for (ExamAttempt a : attempts) {
                if (a != null) {
                    try {
                        Map<String, Object> summary = mapAttemptSummary(a);
                        if (summary != null && !summary.isEmpty()) {
                            rows.add(summary);
                        }
                    } catch (Exception ignored) {}
                }
            }

            // Enforce reviewOnly logic at backend API level:
            // Review & Flags queue MUST only return attempts that require admin review (NEEDS_REVIEW / IN_PROGRESS).
            if (reviewOnly) {
                rows = rows.stream().filter(r -> {
                    String resStr = String.valueOf(r.get("result"));
                    return "NEEDS_REVIEW".equalsIgnoreCase(resStr) || "IN_PROGRESS".equalsIgnoreCase(resStr);
                }).toList();
            }

            if (stack != null && !stack.isBlank()) {
                rows = rows.stream().filter(r -> r.get("stack") != null && stack.equalsIgnoreCase(String.valueOf(r.get("stack")))).toList();
            }
            if (level != null && !level.isBlank()) {
                rows = rows.stream().filter(r -> r.get("level") != null && level.equalsIgnoreCase(String.valueOf(r.get("level")))).toList();
            }
            if (result != null && !result.isBlank()) {
                rows = rows.stream().filter(r -> {
                    String rVal = String.valueOf(r.get("result"));
                    if ("NEEDS_REVIEW".equalsIgnoreCase(result) || "IN_PROGRESS".equalsIgnoreCase(result)) {
                        return "NEEDS_REVIEW".equalsIgnoreCase(rVal) || "IN_PROGRESS".equalsIgnoreCase(rVal);
                    }
                    return result.equalsIgnoreCase(rVal);
                }).toList();
            }

            Map<String, Object> res = new HashMap<>();
            res.put("rows", rows);
            res.put("total", rows.size());

            return ResponseEntity.ok(ApiResponse.success("Attempts retrieved", res));
        } catch (Exception e) {
            System.err.println("Attempts error: " + e.getMessage());
            Map<String, Object> res = new HashMap<>();
            res.put("rows", List.of());
            res.put("total", 0);
            return ResponseEntity.ok(ApiResponse.success("Attempts retrieved (fallback)", res));
        }
    }

    @GetMapping("/attempts/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptById(@PathVariable UUID id) {
        ExamAttempt attempt = attemptRepository.findById(id).orElse(null);

        Map<String, Object> data = attempt != null ? mapAttemptSummary(attempt) : Map.of(
            "id", id.toString(),
            "candidate", "Candidate",
            "exam", "Certification Exam",
            "examTitle", "Certification Exam",
            "stack", "General",
            "level", "—",
            "score", "—",
            "result", "IN_PROGRESS"
        );

        return ResponseEntity.ok(ApiResponse.success("Attempt details retrieved", data));
    }

    @GetMapping("/attempts/{id}/recording-url")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRecordingUrl(
            @PathVariable UUID id,
            Principal principal) {

        String attemptLabel = "Proctoring Session Log";
        try {
            if (attemptRepository != null) {
                ExamAttempt a = attemptRepository.findById(id).orElse(null);
                if (a != null && a.getExam() != null) {
                    attemptLabel = (a.getCandidate() != null ? (a.getCandidate().getFullName() != null ? a.getCandidate().getFullName() : a.getCandidate().getUsername()) : "Candidate")
                            + " - " + a.getExam().getTitle();
                }
            }
        } catch (Exception ignored) {}

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("VIEW_PROCTORING_RECORDING")
                .module("Integrity Review")
                .oldValue("-")
                .newValue(attemptLabel)
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("accessLogged", true);
        res.put("expiresAt", new Date(System.currentTimeMillis() + 3600 * 1000).toString());

        // Look up the real RecordingSession for this attempt
        List<RecordingSession> sessions = recordingSessionRepository.findByAttemptId(id);
        if (!sessions.isEmpty()) {
            // Use the most recent completed session
            sessions.sort((a, b) -> {
                if (a.getEndedAt() == null) return 1;
                if (b.getEndedAt() == null) return -1;
                return b.getEndedAt().compareTo(a.getEndedAt());
            });
            RecordingSession session = sessions.get(0);
            String videoUrl = session.getVideoUrl();
            res.put("url", videoUrl != null ? videoUrl : "");
            res.put("sessionId", session.getId());
            res.put("status", session.getStatus());
            res.put("startedAt", session.getStartedAt() != null ? session.getStartedAt().toString() : null);
            res.put("endedAt", session.getEndedAt() != null ? session.getEndedAt().toString() : null);
        } else {
            res.put("url", "");
            res.put("sessionId", null);
            res.put("status", "NOT_FOUND");
        }

        return ResponseEntity.ok(ApiResponse.success("Recording URL retrieved", res));
    }

    @GetMapping("/attempts/{id}/flags")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptFlags(@PathVariable UUID id) {
        List<String> taxonomy = List.of(
            "FACE_NOT_VISIBLE", "MULTIPLE_FACES", "GAZE_AWAY", "TAB_SWITCH",
            "COPY_PASTE", "SECOND_DEVICE", "VOICE_DETECTED", "SCREEN_SHARE_LOST"
        );

        List<IntegrityViolation> violations = integrityViolationRepository != null
                ? integrityViolationRepository.findByAttemptIdOrderByCreatedAtAsc(id)
                : List.of();
        List<AIFlag> aiFlags = aiFlagRepository != null
                ? aiFlagRepository.findByAttemptId(id)
                : List.of();
        List<ExamViolation> examViolations = examViolationRepository != null
                ? examViolationRepository.findByAttemptIdOrderByCreatedAtAsc(id)
                : List.of();

        List<Map<String, Object>> items = new ArrayList<>();
        int index = 1;

        if (violations != null) {
            for (IntegrityViolation v : violations) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", v.getId() != null ? v.getId().toString() : ("flag-" + index));
                String code = v.getViolationCode() != null ? v.getViolationCode() : "TAB_SWITCH";
                item.put("type", code);

                int tSec = calculateOffsetSeconds(v.getCreatedAt(), id);

                item.put("tSec", tSec);
                item.put("timestampSec", tSec);
                item.put("severity", (code.contains("TAB") || code.contains("FACE")) ? "HIGH" : "MEDIUM");
                String readableDesc = getReadableDescription(code);
                item.put("note", readableDesc);
                item.put("description", readableDesc);
                item.put("thumbnail", v.getSnapshotUrl() != null ? v.getSnapshotUrl() : "");
                items.add(item);
                index++;
            }
        }

        if (examViolations != null) {
            for (ExamViolation v : examViolations) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", v.getId() != null ? v.getId().toString() : ("flag-" + index));
                String code = v.getType() != null ? v.getType() : "TAB_SWITCH";
                item.put("type", code);

                int tSec = calculateOffsetSeconds(v.getCreatedAt(), id);

                item.put("tSec", tSec);
                item.put("timestampSec", tSec);
                item.put("severity", (code.contains("TAB") || code.contains("FACE") || code.contains("BLUR") || code.contains("RESIZE")) ? "HIGH" : "MEDIUM");
                String readableDesc = v.getDescription() != null ? v.getDescription() : getReadableDescription(code);
                item.put("note", readableDesc);
                item.put("description", readableDesc);
                item.put("thumbnail", v.getSnapshotUrl() != null ? v.getSnapshotUrl() : "");
                items.add(item);
                index++;
            }
        }

        if (aiFlags != null) {
            for (AIFlag f : aiFlags) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", f.getId() != null ? f.getId().toString() : ("flag-" + index));
                String type = f.getType() != null ? f.getType() : "GAZE_AWAY";
                item.put("type", type);

                int tSec = calculateOffsetSeconds(f.getTimestamp(), id);

                item.put("tSec", tSec);
                item.put("timestampSec", tSec);
                item.put("severity", (f.getConfidence() != null && f.getConfidence() > 0.8) ? "HIGH" : "MEDIUM");
                String readableDesc = getReadableDescription(type);
                String note = readableDesc + " (Confidence: " + Math.round((f.getConfidence() != null ? f.getConfidence() : 0.95) * 100) + "%)";
                item.put("note", note);
                item.put("description", note);
                item.put("thumbnail", f.getSnapshotUrl() != null ? f.getSnapshotUrl() : "");
                items.add(item);
                index++;
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("taxonomy", taxonomy);
        res.put("items", items);

        return ResponseEntity.ok(ApiResponse.success("Flags retrieved", res));
    }

    @GetMapping("/attempts/{id}/score")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptScore(@PathVariable UUID id) {
        try {
            ExamAttempt attempt = attemptRepository != null ? attemptRepository.findById(id).orElse(null) : null;
            if (attempt == null) {
                Map<String, Object> fallback = new HashMap<>();
                fallback.put("total", 0);
                fallback.put("maxTotal", 100);
                fallback.put("autoResult", "PASS");
                fallback.put("integrityPenaltyApplied", false);
                fallback.put("sections", List.of());
                return ResponseEntity.ok(ApiResponse.success("Score retrieved (fallback)", fallback));
            }

            List<AttemptAnswer> savedAnswers = attemptAnswerRepository != null ? attemptAnswerRepository.findByAttemptId(id) : List.of();
            List<Section> examSections = (attempt.getExam() != null && sectionRepository != null) ? sectionRepository.findByExamId(attempt.getExam().getId()) : List.of();

            List<Map<String, Object>> sectionScores = new ArrayList<>();
            int totalScore = 0;
            int maxTotal = 0;

            List<Question> questions = new ArrayList<>();
            List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository != null
                    ? examAttemptQuestionRepository.findByAttemptIdOrderByQuestionOrderAsc(id)
                    : List.of();
            if (attemptQuestions != null && !attemptQuestions.isEmpty()) {
                for (ExamAttemptQuestion eq : attemptQuestions) {
                    if (eq.getQuestion() != null) questions.add(eq.getQuestion());
                }
            } else if (attempt.getExam() != null && questionRepository != null) {
                questions = questionRepository.findByExamId(attempt.getExam().getId());
                if (questions.isEmpty() && attempt.getExam().getStack() != null) {
                    questions = questionRepository.findByStackIgnoreCase(attempt.getExam().getStack());
                }
                if (questions.isEmpty()) {
                    questions = questionRepository.findByIsActiveTrue();
                }
            }

            Exam exam = attempt.getExam();
            Integer totMarksVal = (exam != null && exam.getTotalMarks() != null) ? exam.getTotalMarks() : 100;

            if (examSections == null || examSections.isEmpty()) {
                double sectionScoreDouble = 0;
                double sectionMaxDouble = 0;
                for (Question q : questions) {
                    double qMarks = (exam != null) ? exam.getQuestionMarks(q.getDifficulty(), questions) : 1.0;
                    sectionMaxDouble += qMarks;
                    Optional<AttemptAnswer> ansOpt = savedAnswers.stream()
                            .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                            .findFirst();
                    if (ansOpt.isPresent() && ansOpt.get().getSelectedOption() != null && q.getCorrectOption() != null && q.getCorrectOption().trim().equalsIgnoreCase(ansOpt.get().getSelectedOption().trim())) {
                        sectionScoreDouble += qMarks;
                    }
                }
                Map<String, Object> secMap = new HashMap<>();
                secMap.put("name", "General");
                secMap.put("score", (int) Math.round(sectionScoreDouble));
                secMap.put("max", (int) Math.round(sectionMaxDouble));
                sectionScores.add(secMap);

                totalScore = (int) Math.round(sectionScoreDouble);
                maxTotal = totMarksVal;
            } else {
                double totalScoreDouble = 0;
                for (Section section : examSections) {
                    double sectionScoreDouble = 0;
                    double sectionMaxDouble = 0;
                    for (Question q : questions) {
                        if (q.getSection() != null && q.getSection().getId().equals(section.getId())) {
                            double qMarks = (exam != null) ? exam.getQuestionMarks(q.getDifficulty(), questions) : 1.0;
                            sectionMaxDouble += qMarks;
                            Optional<AttemptAnswer> ansOpt = savedAnswers.stream()
                                    .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                                    .findFirst();
                            if (ansOpt.isPresent() && ansOpt.get().getSelectedOption() != null && q.getCorrectOption() != null && q.getCorrectOption().trim().equalsIgnoreCase(ansOpt.get().getSelectedOption().trim())) {
                                sectionScoreDouble += qMarks;
                            }
                        }
                    }
                    Map<String, Object> secMap = new HashMap<>();
                    secMap.put("name", section.getName());
                    secMap.put("score", (int) Math.round(sectionScoreDouble));
                    secMap.put("max", (int) Math.round(sectionMaxDouble));
                    sectionScores.add(secMap);

                    totalScoreDouble += sectionScoreDouble;
                }
                totalScore = (int) Math.round(totalScoreDouble);
                maxTotal = totMarksVal;
            }

            totalScore = Math.min(totalScore, maxTotal);

            int passMark = exam != null ? exam.getPassMark() : 70;
            int finalScorePercent = maxTotal > 0 ? (int) Math.round(((double) totalScore / maxTotal) * 100) : 0;
            finalScorePercent = Math.min(finalScorePercent, 100);
            String autoResult = finalScorePercent >= passMark ? "PASS" : "FAIL";

            String levelStr = "—";
            if (finalScorePercent >= passMark && !"REJECTED".equals(attempt.getAdminDecision())) {
                List<CompetencyBand> bands = attempt.getExam() != null ? attempt.getExam().getCompetencyBands() : null;
                if (bands == null || bands.isEmpty()) {
                    bands = new ArrayList<>();
                    bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L1).minScore(90).maxScore(100).title("Expert").build());
                    bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L2).minScore(75).maxScore(89).title("Advanced").build());
                    bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L3).minScore(60).maxScore(74).title("Intermediate").build());
                    bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L4).minScore(40).maxScore(59).title("Beginner").build());
                    bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L5).minScore(0).maxScore(39).title("Needs Improvement").build());
                }
                CompetencyLevel calculatedLevel = com.oryfolks.certify.service.AttemptService.calculateLevel(finalScorePercent, passMark, bands);
                if (calculatedLevel != null) {
                    levelStr = calculatedLevel.name();
                }
            }

            Map<String, Object> scoreMap = new HashMap<>();
            scoreMap.put("total", totalScore);
            scoreMap.put("maxTotal", maxTotal);
            scoreMap.put("autoResult", autoResult);
            scoreMap.put("level", levelStr);
            scoreMap.put("integrityPenaltyApplied", false);
            scoreMap.put("sections", sectionScores);

            return ResponseEntity.ok(ApiResponse.success("Score retrieved", scoreMap));
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("total", 0);
            fallback.put("maxTotal", 100);
            fallback.put("autoResult", "PASS");
            fallback.put("integrityPenaltyApplied", false);
            fallback.put("sections", List.of());
            return ResponseEntity.ok(ApiResponse.success("Score retrieved (fallback)", fallback));
        }
    }

    @PostMapping("/attempts/{id}/decision/confirm")
    public ResponseEntity<ApiResponse<Map<String, Object>>> confirmDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        ExamAttempt attempt = attemptRepository.findById(id).orElse(null);
        String finalResultStr = "NEEDS_REVIEW";
        if (attempt != null) {
            try {
                int finalScore = calculateAttemptScore(attempt);
                attempt.setScore(finalScore);

                int totMarksVal = attempt.getExam().getTotalMarks() != null ? attempt.getExam().getTotalMarks() : 100;
                int finalScorePercent = totMarksVal > 0 ? (int) Math.round(((double) finalScore / totMarksVal) * 100) : 0;

                int passMark = attempt.getExam() != null ? attempt.getExam().getPassMark() : 70;
                if (finalScorePercent >= passMark) {
                    attempt.setResultStatus(com.oryfolks.certify.enums.ResultStatus.PASSED);
                    List<CompetencyBand> bands = attempt.getExam() != null ? attempt.getExam().getCompetencyBands() : null;
                    if (bands == null || bands.isEmpty()) {
                        bands = new ArrayList<>();
                        bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L1).minScore(90).maxScore(100).title("Expert").build());
                        bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L2).minScore(75).maxScore(89).title("Advanced").build());
                        bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L3).minScore(60).maxScore(74).title("Intermediate").build());
                        bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L4).minScore(40).maxScore(59).title("Beginner").build());
                        bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L5).minScore(0).maxScore(39).title("Needs Improvement").build());
                    }
                    attempt.setAssignedLevel(com.oryfolks.certify.service.AttemptService.calculateLevel(finalScorePercent, passMark, bands));
                } else {
                    attempt.setResultStatus(com.oryfolks.certify.enums.ResultStatus.FAILED);
                    attempt.setAssignedLevel(null);
                }
                finalResultStr = attempt.getResultStatus().name();

                attempt.setAdminDecision("CONFIRMED");
                attempt.setResultPublishStatus(ResultPublishStatus.PUBLISHED);
                attempt.setPublishedAt(LocalDateTime.now());
                attemptRepository.save(attempt);
            } catch (Exception e) {
                System.err.println("Error grading attempt: " + e.getMessage());
            }
        }

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("CONFIRM_ATTEMPT_RESULT")
                .module("Integrity Review")
                .oldValue("NEEDS_REVIEW")
                .newValue(finalResultStr)
                .build());

        Map<String, Object> res = Map.of("ok", true, "status", "CONFIRMED");
        return ResponseEntity.ok(ApiResponse.success("Result decision confirmed", res));
    }

    @PostMapping("/attempts/{id}/decision/reject")
    public ResponseEntity<ApiResponse<Map<String, Object>>> rejectDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        ExamAttempt attempt = attemptRepository.findById(id).orElse(null);
        if (attempt != null) {
            String reason = payload != null ? payload.getOrDefault("note", payload.getOrDefault("reason", "")).toString() : "";
            if (reason == null || reason.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Rejection reason is mandatory"));
            }

            attempt.setAdminDecision("REJECTED");
            attempt.setRejectionReason(reason.trim());
            attempt.setResultStatus(com.oryfolks.certify.enums.ResultStatus.FAILED);
            attempt.setResultPublishStatus(ResultPublishStatus.PUBLISHED);
            attempt.setPublishedAt(LocalDateTime.now());
            attemptRepository.save(attempt);

            auditLogRepository.save(AccessAuditLog.builder()
                    .userName(principal != null ? principal.getName() : "Admin User")
                    .action("REJECT_ATTEMPT_RESULT")
                    .module("Integrity Review")
                    .oldValue("NEEDS_REVIEW")
                    .newValue("FAILED (Rejected by Admin)")
                    .build());
        }

        Map<String, Object> res = Map.of("ok", true, "status", "REJECTED");
        return ResponseEntity.ok(ApiResponse.success("Result decision rejected", res));
    }

    @PostMapping("/attempts/{id}/decision/escalate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> escalateDecision(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        String note = payload != null ? payload.getOrDefault("note", "").toString() : "";

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
            map.put("desc", "Requested by " + a.getRequestedBy()
                    + (a.getNote() != null && !a.getNote().isBlank() ? " · " + a.getNote() : ""));
            map.put("time", a.getRequestedAt() != null ? a.getRequestedAt().toString()
                    : new Date().toString());
            map.put("read", Boolean.TRUE.equals(a.getIsRead()));

            map.put("ts", a.getRequestedAt() != null ? a.getRequestedAt().toString()
                    : new Date().toString());
            map.put("text", a.getLabel());
            if ("FOUR_EYES_REVIEW".equalsIgnoreCase(a.getType())) {
                map.put("type", "ESCALATION");
                map.put("attemptId", a.getTargetId());
            } else {
                map.put("type", "REVIEW");
            }
            return map;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", notifs));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markNotificationRead(@PathVariable String id) {
        if ("all".equalsIgnoreCase(id)) {
            List<ApprovalRequest> pending = approvalRepository.findByStatusOrderByRequestedAtDesc("PENDING");
            for (ApprovalRequest req : pending) {
                req.setIsRead(true);
            }
            approvalRepository.saveAll(pending);
        } else {
            approvalRepository.findById(id).ifPresent(req -> {
                req.setIsRead(true);
                approvalRepository.save(req);
            });
        }
        return ResponseEntity.ok(ApiResponse.success("Notification read", Map.of("ok", true)));
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markAllNotificationsRead() {
        List<ApprovalRequest> pending = approvalRepository.findByStatusOrderByRequestedAtDesc("PENDING");
        for (ApprovalRequest req : pending) {
            req.setIsRead(true);
        }
        approvalRepository.saveAll(pending);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", Map.of("ok", true)));
    }

    private Map<String, Object> mapAttemptSummary(ExamAttempt a) {
        Map<String, Object> map = new HashMap<>();
        if (a == null) return map;
        try {
            map.put("id", a.getId() != null ? a.getId().toString() : UUID.randomUUID().toString());
            map.put("candidate", a.getCandidate() != null ? (a.getCandidate().getFullName() != null ? a.getCandidate().getFullName() : a.getCandidate().getUsername()) : "Candidate");
            map.put("email", a.getCandidate() != null ? a.getCandidate().getUsername() : "");
            String examTitle = (a.getExam() != null && a.getExam().getTitle() != null && !a.getExam().getTitle().isBlank())
                    ? a.getExam().getTitle()
                    : "Certification Exam";
            String stack = (a.getExam() != null && a.getExam().getStack() != null && !a.getExam().getStack().isBlank())
                    ? a.getExam().getStack()
                    : "General";
            boolean isPublished = (a.getResultPublishStatus() == ResultPublishStatus.PUBLISHED);

            String level = "—";
            boolean isPass = (a.getResultStatus() == ResultStatus.PASSED) && !"REJECTED".equals(a.getAdminDecision());
            if (isPublished && isPass) {
                level = a.getAssignedLevel() != null ? a.getAssignedLevel().name()
                        : (a.getCompetencyLevel() != null ? a.getCompetencyLevel().name() : "—");
            }

            map.put("exam", examTitle);
            map.put("examTitle", examTitle);
            map.put("stack", stack);
            map.put("level", level);

            if (isPublished) {
                int score = a.getScore() != null ? a.getScore() : 0;
                if (score == 0 && a.getExam() != null) {
                    try {
                        score = calculateAttemptScore(a);
                        if (score > 0) {
                            a.setScore(score);
                            if (attemptRepository != null) attemptRepository.save(a);
                        }
                    } catch (Exception ignored) {}
                }
                map.put("score", score);
            } else {
                map.put("score", "—");
            }

            String resultStr = "NEEDS_REVIEW";
            if (isPublished) {
                if (a.getResultStatus() == ResultStatus.PASSED) {
                    resultStr = "PASS";
                } else if (a.getResultStatus() == ResultStatus.FAILED || a.getResultStatus() == ResultStatus.TERMINATED) {
                    resultStr = "FAIL";
                } else {
                    resultStr = "PASS";
                }
            }
            map.put("result", resultStr);

            map.put("submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString()
                    : (a.getEndTime() != null ? a.getEndTime().toString()
                    : (a.getCreatedAt() != null ? a.getCreatedAt().toString() : new Date().toString())));

            long violationCount = 0;
            if (integrityViolationRepository != null && a.getId() != null) {
                try {
                    List<IntegrityViolation> vList = integrityViolationRepository.findByAttemptIdOrderByCreatedAtAsc(a.getId());
                    if (vList != null) violationCount = vList.size();
                } catch (Exception ignored) {}
            }

            long aiFlagCount = 0;
            if (aiFlagRepository != null && a.getId() != null) {
                try {
                    List<AIFlag> fList = aiFlagRepository.findByAttemptId(a.getId());
                    if (fList != null) aiFlagCount = fList.size();
                } catch (Exception ignored) {}
            }

            long examViolationCount = 0;
            if (examViolationRepository != null && a.getId() != null) {
                try {
                    examViolationCount = examViolationRepository.countByAttemptId(a.getId());
                } catch (Exception ignored) {}
            }

            long totalFlags = violationCount + aiFlagCount + examViolationCount;

            map.put("flagCount", totalFlags);
            map.put("flaggedAt", a.getSubmittedAt() != null ? a.getSubmittedAt().toString()
                    : (a.getEndTime() != null ? a.getEndTime().toString()
                    : (a.getCreatedAt() != null ? a.getCreatedAt().toString() : new Date().toString())));
        } catch (Exception e) {
            System.err.println("mapAttemptSummary error: " + e.getMessage());
        }
        return map;
    }

    private int calculateAttemptScore(ExamAttempt attempt) {
        if (attempt == null || attempt.getExam() == null) return 0;
        List<AttemptAnswer> aaList = attemptAnswerRepository != null ? attemptAnswerRepository.findByAttemptId(attempt.getId()) : List.of();
        List<Answer> aList = answerRepository != null ? answerRepository.findByAttemptId(attempt.getId()) : List.of();

        List<Question> questions = new ArrayList<>();
        List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository != null
                ? examAttemptQuestionRepository.findByAttemptIdOrderByQuestionOrderAsc(attempt.getId())
                : List.of();
        if (attemptQuestions != null && !attemptQuestions.isEmpty()) {
            for (ExamAttemptQuestion eq : attemptQuestions) {
                if (eq.getQuestion() != null) questions.add(eq.getQuestion());
            }
        } else if (questionRepository != null) {
            questions = questionRepository.findByExamId(attempt.getExam().getId());
            if (questions.isEmpty() && attempt.getExam().getStack() != null) {
                questions = questionRepository.findByStackIgnoreCase(attempt.getExam().getStack());
            }
            if (questions.isEmpty()) {
                questions = questionRepository.findByIsActiveTrue();
            }
        }
        if (questions.isEmpty()) return 0;

        double correctMarksSum = 0;
        for (Question q : questions) {
            String correct = q.getCorrectOption() != null ? q.getCorrectOption().trim() : "";

            String userSelected = null;
            if (aaList != null) {
                Optional<AttemptAnswer> aaOpt = aaList.stream()
                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                        .findFirst();
                if (aaOpt.isPresent() && aaOpt.get().getSelectedOption() != null) {
                    userSelected = aaOpt.get().getSelectedOption().trim();
                }
            }
            if (userSelected == null && aList != null) {
                Optional<Answer> aOpt = aList.stream()
                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                        .findFirst();
                if (aOpt.isPresent() && aOpt.get().getSelectedOption() != null) {
                    userSelected = aOpt.get().getSelectedOption().trim();
                }
            }

            if (userSelected != null && !correct.isEmpty() && correct.equalsIgnoreCase(userSelected)) {
                correctMarksSum += attempt.getExam().getQuestionMarks(q.getDifficulty(), questions);
            }
        }
        int finalScore = (int) Math.round(correctMarksSum);
        Integer totMarksVal = attempt.getExam().getTotalMarks() != null ? attempt.getExam().getTotalMarks() : 100;
        return Math.min(finalScore, totMarksVal);
    }

    private int calculateOffsetSeconds(LocalDateTime eventTime, UUID attemptId) {
        if (eventTime == null) return 0;
        
        List<RecordingSession> sessions = recordingSessionRepository.findByAttemptId(attemptId);
        LocalDateTime startedAt = null;
        if (sessions != null && !sessions.isEmpty()) {
            sessions.sort((a, b) -> {
                if (a.getStartedAt() == null) return 1;
                if (b.getStartedAt() == null) return -1;
                return a.getStartedAt().compareTo(b.getStartedAt());
            });
            startedAt = sessions.get(0).getStartedAt();
        }
        
        if (startedAt == null) {
            ExamAttempt attempt = attemptRepository.findById(attemptId).orElse(null);
            if (attempt != null) {
                startedAt = attempt.getStartTime();
            }
        }
        
        if (startedAt != null) {
            long seconds = java.time.Duration.between(startedAt, eventTime).toSeconds();
            return seconds >= 0 ? (int) seconds : 0;
        }
        
        return 0;
    }

    private String getReadableDescription(String type) {
        if (type == null) return "Integrity Warning";
        switch (type.toUpperCase()) {
            case "WINDOW_BLUR":
                return "Window Focus Lost (Tab Switched / Minimised)";
            case "WINDOW_RESIZE":
                return "Browser Window Resized";
            case "TAB_SWITCH":
                return "Tab Switched";
            case "FULLSCREEN_EXIT":
                return "Fullscreen Mode Exited";
            case "MULTIPLE_FACES":
            case "MULTIPLE_FACE":
                return "Multiple Faces Detected";
            case "FACE_NOT_DETECTED":
                return "Candidate Not Visible / Out of Camera";
            case "FACE_NOT_DETECTED_TIMEOUT":
                return "No face/candidate detected for 60 seconds.";
            case "GAZE_AWAY":
                return "Candidate Gaze Away from Screen";
            case "SECOND_DEVICE":
            case "MOBILE_PHONE":
                return "Mobile Phone / Second Device Detected";
            case "MOBILE_PHONE_TIMEOUT":
                return "Mobile phone/second device continuously detected for 60 seconds.";
            case "VOICE_DETECTED":
                return "Voice Detected";
            default:
                return type.replace("_", " ");
        }
    }
}
