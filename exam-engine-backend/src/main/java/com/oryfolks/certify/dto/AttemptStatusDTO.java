package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttemptStatusDTO {
    private String status;
    private long remainingSeconds;
    private LocalDateTime lastSeen;
    private int syncedCount;
    private Long beginnerTimeRemaining;
    private Long intermediateTimeRemaining;
    private Long advancedTimeRemaining;
}
