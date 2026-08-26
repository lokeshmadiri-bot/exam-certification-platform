package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncRequestDTO {
    private List<AnswerSyncDTO> answers;
    private Long remainingSeconds;
    private Long beginnerTimeRemaining;
    private Long intermediateTimeRemaining;
    private Long advancedTimeRemaining;
}
