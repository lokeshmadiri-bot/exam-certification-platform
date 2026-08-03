package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.AttemptHistoryResponseDTO;
import com.oryfolks.certify.dto.AttemptDetailsResponseDTO;
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

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.security.access.prepost.PreAuthorize;
import java.security.Principal;

import java.util.UUID;
@RestController
@RequestMapping("/api/candidate/attempts")
public class AttemptController {

@Autowired
private AttemptService attemptService;

    @Autowired
    private StorageService storageService;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<StartExamResponseDTO>> startAttempt(
            @Valid @RequestBody StartExamRequestDTO request,
            Principal principal) {

        StartExamResponseDTO response =
                attemptService.startExam(request, principal.getName());

        return ResponseEntity.ok(
                ApiResponse.success("Exam started successfully.", response));
    }


    @PostMapping("/{attemptId}/tab-switch")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<String>> recordTabSwitch(
            @PathVariable UUID attemptId) {

        attemptService.recordTabSwitch(attemptId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Tab switch recorded successfully.",
                        null
                )
        );
    }


    @PostMapping("/{attemptId}/violation")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<ApiResponse<String>> recordViolation(
            @PathVariable UUID attemptId,
            @RequestParam String violationCode,
            @RequestParam(required = false) String metaDescription,
            @RequestParam String timestampOffset,
            @RequestParam(required = false) MultipartFile snapshot) {

        attemptService.recordViolation(
                attemptId,
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


    @PostMapping("/{attemptId}/answers")
    public ResponseEntity<ApiResponse<Answer>> saveAnswer(
            @PathVariable UUID attemptId,
            @RequestBody AnswerSubmission submission) {

        Answer answer =
                attemptService.saveAnswer(
                        attemptId,
                        submission);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Answer saved successfully.",
                        answer));
    }

}
