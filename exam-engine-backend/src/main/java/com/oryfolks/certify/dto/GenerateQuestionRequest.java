package com.oryfolks.certify.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GenerateQuestionRequest {
    private String stack;          // Java, React, Python, Node, SQL
    private String level;          // L1, L2, L3, L4, L5
    private String difficulty;     // EASY, MEDIUM, HARD
    private String type;           // MCQ, CODING, DESCRIPTIVE
    private String topic;          // Prompt / specific topic guidelines
    @Builder.Default
    private Integer count = 3;     // Default 3 questions
    private UUID examId;           // Optional exam ID
}
