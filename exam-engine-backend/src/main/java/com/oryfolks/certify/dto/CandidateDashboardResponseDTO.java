package com.oryfolks.certify.dto;

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
public class CandidateDashboardResponseDTO {

    private UUID candidateId;

    private String fullName;

    private String title;

    private List<ExamCardResponseDTO> availableExams;

    private List<ExamHistoryResponseDTO> recentAttempts;

}