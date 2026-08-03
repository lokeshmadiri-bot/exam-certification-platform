package com.oryfolks.certify.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmitExamRequestDTO {

    @NotNull(message = "Attempt ID is required.")
    private UUID attemptId;

    @Valid
    @NotEmpty(message = "Answers cannot be empty.")
    private List<AnswerSubmission> answers;

    @Builder.Default
    private Boolean forceSubmit = false;

}