package com.oryfolks.certify.dto;

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
public class AttemptHistoryResponseDTO {

    private UUID attemptId;

    private UUID examId;

    private String examTitle;

    private String stack;

    private String candidateName;

    private LocalDateTime startedAt;

    private LocalDateTime submittedAt;

    private ResultStatus resultStatus;

    private ResultPublishStatus resultPublishStatus;
}