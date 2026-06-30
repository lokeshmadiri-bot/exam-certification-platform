package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.Role;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ROLE_ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @GetMapping("/candidates")
    public ResponseEntity<ApiResponse<List<User>>> getCandidates() {
        List<User> candidates = userRepository.findByRole(Role.ROLE_CANDIDATE);
        return ResponseEntity.ok(ApiResponse.success("Candidates retrieved successfully", candidates));
    }

    @PostMapping("/candidates/{id}/override")
    public ResponseEntity<ApiResponse<String>> approveOverride(@PathVariable UUID id, Principal principal) {
        User admin = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        User candidate = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + id));

        // Create log of this override approval
        auditLogRepository.save(AccessAuditLog.builder()
                .user(admin)
                .action("Approved 30-day exam retry override lock for candidate: " + candidate.getFullName())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Override lock successfully approved", candidate.getFullName()));
    }

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<List<AccessAuditLog>>> getAuditLogs() {
        List<AccessAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", logs));
    }
}
