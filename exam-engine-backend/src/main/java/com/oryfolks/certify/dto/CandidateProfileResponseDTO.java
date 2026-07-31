package com.oryfolks.certify.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileResponseDTO {

    private UUID id;

    private String username;

    private String fullName;

}