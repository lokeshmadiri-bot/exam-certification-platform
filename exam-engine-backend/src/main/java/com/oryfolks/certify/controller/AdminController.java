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

import java.security.Principal;
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
            ExamAttempt latest = attempts.isEmpty() ? null : attempts.get(0);

            String candExam = latest != null && latest.getExam() != null ? latest.getExam().getTitle() : "Java Backend Developer";
            String candStatus = latest != null ? latest.getResultStatus().name() : "NOT_STARTED";
            boolean isLocked = attempts.size() >= 3;

            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId().toString());
            map.put("name", c.getFullName() != null ? c.getFullName() : c.getUsername());
            map.put("email", c.getUsername().contains("@") ? c.getUsername() : c.getUsername() + "@certify.com");
            map.put("exam", candExam);
            map.put("status", candStatus);
            map.put("locked", isLocked);
            map.put("lockedUntil", isLocked ? new Date(System.currentTimeMillis() + 30L * 86400 * 1000).toString() : null);
            map.put("lastAttempt", latest != null && latest.getCreatedAt() != null ? latest.getCreatedAt().toString() : null);
            map.put("pendingApproval", null);

            rows.add(map);
        }

        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            rows = rows.stream().filter(r -> r.get("name").toString().toLowerCase().contains(query) || r.get("email").toString().toLowerCase().contains(query)).toList();
        }
        if (status != null && !status.isBlank()) {
            rows = rows.stream().filter(r -> r.get("status").toString().equalsIgnoreCase(status)).toList();
        }
        if (exam != null && !exam.isBlank()) {
            rows = rows.stream().filter(r -> r.get("exam").toString().equalsIgnoreCase(exam)).toList();
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
                .type("CANDIDATE_UNLOCK")
                .label("Unlock candidate · " + candidate.getFullName())
                .targetId(id.toString())
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .build();

        ApprovalRequest saved = approvalRepository.save(req);

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("approval", saved);
        return ResponseEntity.ok(ApiResponse.success("Lock override approval requested", res));
    }

    @PostMapping("/candidates/{id}/override")
    public ResponseEntity<ApiResponse<String>> approveOverride(@PathVariable UUID id, Principal principal) {
        User candidate = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + id));

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("Approved 30-day exam retry override lock for candidate: " + candidate.getFullName())
                .module("Candidates")
                .oldValue("LOCKED")
                .newValue("UNLOCKED")
                .build());

        return ResponseEntity.ok(ApiResponse.success("Override lock successfully approved", candidate.getFullName()));
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
}
