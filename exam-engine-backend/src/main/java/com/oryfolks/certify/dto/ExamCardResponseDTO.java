package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.ExamStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamCardResponseDTO {

    private UUID examId;

    private String title;

    private String stack;

    private Integer durationMinutes;

    private Integer perAttempt;

    private Integer passMark;

    private String version;

    private ExamStatus status;

}