package com.oryfolks.certify.dto;

import com.oryfolks.certify.enums.CompetencyLevel;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompetencyBandDTO {

    private CompetencyLevel levelName;

    private String title;

    private Integer minScore;

    private Integer maxScore;

}