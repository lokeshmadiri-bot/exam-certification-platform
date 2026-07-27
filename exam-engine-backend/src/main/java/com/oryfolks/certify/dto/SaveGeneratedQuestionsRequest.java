package com.oryfolks.certify.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaveGeneratedQuestionsRequest {
    private UUID examId;
    private List<GeneratedQuestionDTO> questions;
}
