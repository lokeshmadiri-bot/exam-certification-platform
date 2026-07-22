package com.oryfolks.certify.dto;

import lombok.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunnerResponseDTO {

    private UUID attemptId;

    private String examTitle;

    private List<RunnerSectionDTO> sections;

    private Map<String, String> answers;
}