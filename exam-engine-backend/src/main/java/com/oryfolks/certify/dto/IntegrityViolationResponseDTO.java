package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IntegrityViolationResponseDTO {

    private String violationCode;

    private String metaDescription;

    private String timestampOffset;

    private String snapshotUrl;
}