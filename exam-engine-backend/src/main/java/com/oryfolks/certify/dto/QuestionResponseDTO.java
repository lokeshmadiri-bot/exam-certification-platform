package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponseDTO {

    private UUID questionId;

    private String questionText;

    private String codeSnippet;

    private Integer marks;

    private String optionA;

    private String optionB;

    private String optionC;

    private String optionD;

}