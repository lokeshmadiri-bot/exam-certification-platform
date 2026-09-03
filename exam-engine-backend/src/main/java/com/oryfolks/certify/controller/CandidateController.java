package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.dto.AttemptDetailsResponseDTO;
import com.oryfolks.certify.dto.AttemptHistoryResponseDTO;
import com.oryfolks.certify.dto.CandidateDashboardResponseDTO;
import com.oryfolks.certify.dto.CandidateProfileResponseDTO;
import com.oryfolks.certify.dto.ResultResponseDTO;
import com.oryfolks.certify.service.CandidateService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/candidate")
@RequiredArgsConstructor
public class CandidateController {

        private final CandidateService candidateService;

        private String getUsername(Principal principal) {
            if (principal != null && principal.getName() != null) {
                return principal.getName();
            }
            return "candidate";
        }

        /**
         * Candidate Dashboard
         */
        @GetMapping("/dashboard")
        public ResponseEntity<ApiResponse<CandidateDashboardResponseDTO>> getDashboard(
                        Principal principal) {

                CandidateDashboardResponseDTO response = candidateService.getDashboard(getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Dashboard retrieved successfully.",
                                                response));
        }

        @GetMapping("/profile")
        public ResponseEntity<ApiResponse<CandidateProfileResponseDTO>> getProfile(
                        Principal principal) {

                CandidateProfileResponseDTO response = candidateService.getProfile(getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Candidate profile fetched successfully.",
                                                response));
        }

        /**
         * Candidate Attempt History
         */
        @GetMapping("/attempts")
        public ResponseEntity<ApiResponse<List<AttemptHistoryResponseDTO>>> getMyAttempts(
                        Principal principal) {

                List<AttemptHistoryResponseDTO> response = candidateService.getMyAttempts(getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Attempt history retrieved successfully.",
                                                response));
        }

        /**
         * Candidate Attempt Details
         */
        @GetMapping("/attempts/{attemptId}")
        public ResponseEntity<ApiResponse<AttemptDetailsResponseDTO>> getAttemptDetails(
                        @PathVariable @NotNull UUID attemptId,
                        Principal principal) {

                AttemptDetailsResponseDTO response = candidateService.getAttemptDetails(
                                attemptId,
                                getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Attempt details retrieved successfully.",
                                                response));
        }

        /**
         * Candidate Results
         */
        @GetMapping("/results")
        public ResponseEntity<ApiResponse<List<ResultResponseDTO>>> getMyResults(
                        Principal principal) {

                List<ResultResponseDTO> response = candidateService.getMyResults(getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Results retrieved successfully.",
                                                response));
        }

        @GetMapping("/notifications")
        public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getNotifications(
                        Principal principal) {

                List<Map<String, Object>> response = candidateService.getNotifications(getUsername(principal));

                return ResponseEntity.ok(
                                ApiResponse.success(
                                                "Notifications retrieved successfully.",
                                                response));
        }

}