package com.oryfolks.certify.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratedQuestionDTO {
    private String tempId;
    private String questionText;
    private String codeSnippet;
    private String stack;
    private String topic;
    private String type;           // MCQ, CODING, DESCRIPTIVE
    private String level;          // L1, L2, L3, L4, L5
    private String difficulty;     // EASY, MEDIUM, HARD
    private Integer marks;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private String correctOption;  // A, B, C, D
    private String language;
    private String sampleInput;
    private String sampleOutput;
    private String expectedOutput;
    private String modelAnswer;
    private String explanation;
    @Builder.Default
    private String source = "AI";
    @Builder.Default
    private String aiModel = "Gemini-2.5-Flash";
    private UUID examId;
}