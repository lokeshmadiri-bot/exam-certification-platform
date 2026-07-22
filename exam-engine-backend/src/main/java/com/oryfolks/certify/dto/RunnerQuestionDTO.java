package com.oryfolks.certify.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunnerQuestionDTO {

    private UUID id;

    private String questionText;

    private String codeSnippet;

    private String difficulty;

    private Integer marks;

    private String optionA;

    private String optionB;

    private String optionC;

    private String optionD;
}