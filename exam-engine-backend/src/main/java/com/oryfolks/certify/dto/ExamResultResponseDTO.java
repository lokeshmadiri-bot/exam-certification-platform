package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.CompetencyLevel;
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
public class ExamResultResponseDTO {

    private UUID attemptId;

    private String examTitle;

    private Integer score;

    private Integer totalQuestions;

    private Integer correctAnswers;

    private ResultStatus resultStatus;

    private CompetencyLevel assignedLevel;

    private String competencyTitle;

    private LocalDateTime submittedAt;

}