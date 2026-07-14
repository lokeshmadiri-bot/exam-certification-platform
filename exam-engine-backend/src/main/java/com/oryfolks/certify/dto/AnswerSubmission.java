package com.oryfolks.certify.dto;

import lombok.Data;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Data
public class AnswerSubmission {
    @NotNull(message = "Question ID is required.")
    private UUID questionId;

    private String selectedOption;// A, B, C, D

    private Integer optionId; // 1, 2, 3, 4
}
