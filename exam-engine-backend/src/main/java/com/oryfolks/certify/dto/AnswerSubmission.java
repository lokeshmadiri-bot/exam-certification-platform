package com.oryfolks.certify.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AnswerSubmission {
    private UUID questionId;
    private String selectedOption; // A, B, C, D
}
