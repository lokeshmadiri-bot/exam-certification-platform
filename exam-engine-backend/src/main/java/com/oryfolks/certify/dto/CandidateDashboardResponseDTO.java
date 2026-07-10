package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateDashboardResponseDTO {

    private String fullName;

    private String title;

    private Long totalAttempts;

    private Long inProgressAttempts;

    private Long submittedAttempts;

    private Long publishedResults;

    private List<AttemptHistoryResponseDTO> recentAttempts;

}