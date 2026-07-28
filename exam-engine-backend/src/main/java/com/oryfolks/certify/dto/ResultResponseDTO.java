package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.enums.ResultPublishStatus;
import com.oryfolks.certify.enums.ResultStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultResponseDTO {

    private UUID attemptId;

    private UUID examId;

    private String examTitle;

    private String stack;

    /**
     * Will be SUBMITTED while under review,
     * PASSED / FAILED after admin publishes.
     */
    private ResultStatus resultStatus;

    /**
     * PENDING / PUBLISHED
     */
    private ResultPublishStatus resultPublishStatus;

    /**
     * Null until admin publishes.
     */
    private CompetencyLevel competencyLevel;

    /**
     * Null until admin publishes.
     */
    private LocalDateTime publishedAt;
}   