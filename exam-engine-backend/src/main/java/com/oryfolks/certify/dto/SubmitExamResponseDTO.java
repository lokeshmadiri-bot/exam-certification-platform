package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.ResultStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitExamResponseDTO {

    private UUID attemptId;

    private ResultStatus status;

    private String message;

    private LocalDateTime submittedAt;

}