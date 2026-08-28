package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.ResultPublishStatus;
import com.oryfolks.certify.enums.ResultStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptDetailsResponseDTO {

    private UUID attemptId;

    private UUID examId;

    private String examTitle;

    private String stack;

    private LocalDateTime startedAt;

    private LocalDateTime submittedAt;

    private Integer score;

    private Integer totalMarks;

    private ResultStatus resultStatus;

    private ResultPublishStatus resultPublishStatus;

    private String assignedLevel;

    private String assignedLevelTitle;

    private List<AttemptAnswerResponseDTO> answers;

    private List<IntegrityViolationResponseDTO> integrityViolations;

    private String adminDecision;

    private String rejectionReason;
}