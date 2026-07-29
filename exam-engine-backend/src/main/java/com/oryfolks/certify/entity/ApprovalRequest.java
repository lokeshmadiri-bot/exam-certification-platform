package com.oryfolks.certify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // EXAM_ACTIVATE, EXAM_DEACTIVATE, CANDIDATE_UNLOCK, RETENTION_CHANGE

    @Column(name = "label", nullable = false, length = 255)
    private String label;

    @Column(name = "target_id", length = 100)
    private String targetId;

    @Column(name = "requested_by", nullable = false, length = 100)
    private String requestedBy;

    @CreationTimestamp
    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;
}
