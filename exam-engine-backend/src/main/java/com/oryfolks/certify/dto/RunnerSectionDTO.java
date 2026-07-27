package com.oryfolks.certify.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RunnerSectionDTO {

    private String id;

    private String name;

    private List<RunnerQuestionDTO> questions;
}