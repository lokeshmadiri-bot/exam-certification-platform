package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.dto.AnswerSubmission;
import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.repository.*;
import com.oryfolks.certify.service.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import jakarta.validation.Valid;

import com.oryfolks.certify.dto.StartExamRequestDTO;
import com.oryfolks.certify.dto.StartExamResponseDTO;

import com.oryfolks.certify.dto.SubmitExamRequestDTO;
import com.oryfolks.certify.dto.SubmitExamResponseDTO;

import com.oryfolks.certify.service.AttemptService;

import org.springframework.security.access.prepost.PreAuthorize;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/attempts")
public class AttemptController {

    @Autowired
private AttemptService attemptService;

@Autowired
private UserRepository userRepository;

@Autowired
private QuestionRepository questionRepository;

@Autowired
private AttemptAnswerRepository attemptAnswerRepository;


@Autowired
private ExamAttemptRepository examAttemptRepository;

    @Autowired
    private IntegrityViolationRepository integrityViolationRepository;

    @Autowired
    private StorageService storageService;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private AnswerRepository answerRepository;

    // Retrieve all attempts (for administrator oversight)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamAttempt>>> getAllAttempts() {
        List<ExamAttempt> attempts = examAttemptRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success("Attempts fetched successfully", attempts));
    }

    // Get detail of single attempt
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttemptDetail(@PathVariable UUID id,
            Principal principal) {
        ExamAttempt attempt = examAttemptRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + id));

        // Audit log access if administrator views this
        User user = userRepository.findByUsername(principal.getName()).orElse(null);
        if (user != null && user.getRole() == UserRole.ROLE_ADMIN) {
            auditLogRepository.save(AccessAuditLog.builder()
                    .user(user)
                    .action("Viewed recording / details for Attempt #" + attempt.getId())
                    .build());
        }

        List<IntegrityViolation> violations = integrityViolationRepository.findByAttemptIdOrderByCreatedAtAsc(id);

        Map<String, Object> data = new HashMap<>();
        data.put("attempt", attempt);
        data.put("violations", violations);

        return ResponseEntity.ok(ApiResponse.success("Attempt details retrieved", data));
    }

    // Fetch attempt history of the logged-in candidate
    @GetMapping("/my-attempts")
    public ResponseEntity<ApiResponse<List<ExamAttempt>>> getMyAttempts(Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<ExamAttempt> attempts = examAttemptRepository.findByCandidateIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Candidate attempts fetched", attempts));
    }

    @PostMapping("/start")
public ResponseEntity<ApiResponse<StartExamResponseDTO>> startAttempt(
        @Valid @RequestBody StartExamRequestDTO request,
        Principal principal) {

    StartExamResponseDTO response =
            attemptService.startExam(request, principal.getName());

    return ResponseEntity.ok(
            ApiResponse.success("Exam started successfully.", response));
}

   @PostMapping("/{id}/tab-switch")
@PreAuthorize("hasRole('CANDIDATE')")
public ResponseEntity<ApiResponse<String>> recordTabSwitch(
        @PathVariable UUID id) {

    attemptService.recordTabSwitch(id);

    return ResponseEntity.ok(
            ApiResponse.success(
                    "Tab switch recorded successfully.",
                    null
            )
    );
}
    @PostMapping("/{id}/violation")
@PreAuthorize("hasRole('CANDIDATE')")
public ResponseEntity<ApiResponse<String>> recordViolation(
        @PathVariable UUID id,
        @RequestParam String violationCode,
        @RequestParam(required = false) String metaDescription,
        @RequestParam String timestampOffset,
        @RequestParam(required = false) MultipartFile snapshot) {

    attemptService.recordViolation(
            id,
            violationCode,
            metaDescription,
            timestampOffset,
            snapshot
    );

    return ResponseEntity.ok(
            ApiResponse.success(
                    "Integrity violation recorded successfully.",
                    null
            )
    );
}

    @PostMapping("/submit")
@PreAuthorize("hasRole('CANDIDATE')")
public ResponseEntity<ApiResponse<SubmitExamResponseDTO>> submitAttempt(
        @Valid @RequestBody SubmitExamRequestDTO request,
        Principal principal) {

    SubmitExamResponseDTO response =
            attemptService.submitExam(request, principal.getName());

    return ResponseEntity.ok(
            ApiResponse.success(
                    "Exam submitted successfully.",
                    response
            )
    );
}
}
