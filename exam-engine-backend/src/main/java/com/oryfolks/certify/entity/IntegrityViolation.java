package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "integrity_violations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "attempt")
public class IntegrityViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    @JsonIgnore
    private ExamAttempt attempt;

    @NotBlank(message = "Violation code is required.")
    @Column(name = "violation_code", nullable = false, length = 50)
    private String violationCode;

    @Column(name = "meta_description", columnDefinition = "TEXT")
    private String metaDescription;

    @NotBlank(message = "Timestamp offset is required.")
    @Column(name = "timestamp_offset", nullable = false, length = 10)
    private String timestampOffset;

    @Column(name = "snapshot_url", columnDefinition = "TEXT")
    private String snapshotUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

}