package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.repository.*;
import com.oryfolks.certify.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin/approvals")
public class ApprovalsController {

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private GovernanceSettingRepository governanceSettingRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ExamAttemptRepository attemptRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ApprovalRequest>>> getPendingApprovals() {
        List<ApprovalRequest> pending = approvalRepository.findByStatusOrderByRequestedAtDesc("PENDING");
        return ResponseEntity.ok(ApiResponse.success("Pending approvals retrieved", pending));
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<ApiResponse<ApprovalRequest>> approve(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {

        ApprovalRequest req = approvalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Approval request not found: " + id));

        String note = body != null ? body.getOrDefault("note", "") : "";
        String adminName = principal != null ? principal.getName() : "Admin User";

        req.setStatus("APPROVED");
        req.setResolvedBy(adminName);
        req.setResolvedAt(LocalDateTime.now());
        req.setResolutionNote(note);

        // Execute side effect based on approval type
        if ("EXAM_ACTIVATE".equalsIgnoreCase(req.getType()) || "EXAM_DEACTIVATE".equalsIgnoreCase(req.getType())) {
            UUID examId = UUID.fromString(req.getTargetId());
            Exam exam = examRepository.findById(examId).orElse(null);
            if (exam != null) {
                if ("EXAM_ACTIVATE".equalsIgnoreCase(req.getType())) {
                    long activeCount = questionRepository != null ? questionRepository.countByExamIdAndIsActiveTrue(examId) : 0;
                    if (activeCount == 0 && questionRepository != null) {
                        activeCount = questionRepository.countByExamId(examId);
                    }
                    int poolSize = exam.getQuestionPool() != null ? exam.getQuestionPool() : 0;
                    if (activeCount < poolSize) {
                        long remaining = poolSize - activeCount;
                        throw new RuntimeException(String.format(
                            "Cannot approve activation: Question Pool Size is incomplete (%d required, %d available, %d remaining).",
                            poolSize, activeCount, remaining
                        ));
                    }
                }

                ExamStatus newStatus = "EXAM_ACTIVATE".equalsIgnoreCase(req.getType()) ? ExamStatus.ACTIVE : ExamStatus.INACTIVE;
                auditLogRepository.save(AccessAuditLog.builder()
                        .userName(adminName)
                        .action(req.getType())
                        .module("Exams Library")
                        .oldValue(exam.getStatus().name())
                        .newValue(newStatus.name())
                        .build());

                exam.setStatus(newStatus);
                examRepository.save(exam);
            }
        } else if ("RETENTION_CHANGE".equalsIgnoreCase(req.getType())) {
            List<GovernanceSetting> settings = governanceSettingRepository.findAll();
            if (!settings.isEmpty() && req.getPayloadJson() != null) {
                try {
                    String[] parts = req.getPayloadJson().split(":");
                    int newDays = Integer.parseInt(parts[0]);
                    GovernanceSetting gs = settings.get(0);
                    auditLogRepository.save(AccessAuditLog.builder()
                            .userName(adminName)
                            .action("RETENTION_POLICY_CHANGE")
                            .module("Governance")
                            .oldValue(gs.getRetentionDays() + "d")
                            .newValue(newDays + "d")
                            .build());

                    gs.setRetentionDays(newDays);
                    governanceSettingRepository.save(gs);
                } catch (Exception ignored) {}
            }
        } else if ("CANDIDATE_UNLOCK".equalsIgnoreCase(req.getType())) {
            try {
                String[] parts = req.getTargetId().split(":");
                UUID candidateId = UUID.fromString(parts[0]);
                UUID examId = parts.length > 1 ? UUID.fromString(parts[1]) : null;

                User candidate = userRepository.findById(candidateId).orElse(null);
                if (candidate != null) {
                    if (examId != null) {
                        Optional<ExamAttempt> attemptOpt = attemptRepository.findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(candidate.getId(), examId);
                        if (attemptOpt.isPresent()) {
                            ExamAttempt a = attemptOpt.get();
                            a.setRetryOverrideApproved(true);
                            attemptRepository.save(a);
                        }
                    } else {
                        List<ExamAttempt> candidateAttempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());
                        for (ExamAttempt a : candidateAttempts) {
                            a.setRetryOverrideApproved(true);
                            attemptRepository.save(a);
                        }
                    }
                }
                String candName = candidate != null ? candidate.getFullName() : parts[0];
                auditLogRepository.save(AccessAuditLog.builder()
                        .userName(adminName)
                        .action("Approved 30-day exam retry override lock for candidate: " + candName)
                        .module("Candidates")
                        .oldValue("LOCKED")
                        .newValue("UNLOCKED")
                        .build());
            } catch (Exception ignored) {}
        }

        ApprovalRequest saved = approvalRepository.save(req);
        return ResponseEntity.ok(ApiResponse.success("Request approved", saved));
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<ApiResponse<ApprovalRequest>> reject(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {

        ApprovalRequest req = approvalRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Approval request not found: " + id));

        String note = body != null ? body.getOrDefault("note", "") : "";
        String adminName = principal != null ? principal.getName() : "Admin User";

        req.setStatus("REJECTED");
        req.setResolvedBy(adminName);
        req.setResolvedAt(LocalDateTime.now());
        req.setResolutionNote(note);

        ApprovalRequest saved = approvalRepository.save(req);
        return ResponseEntity.ok(ApiResponse.success("Request rejected", saved));
    }
}
