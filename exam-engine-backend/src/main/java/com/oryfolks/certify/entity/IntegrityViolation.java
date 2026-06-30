package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "integrity_violations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "attempt")
public class IntegrityViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    @JsonIgnore
    private ExamAttempt attempt;

    @Column(name = "violation_code", nullable = false, length = 50)
    private String violationCode; // LOOKING_AWAY, MULTIPLE_FACES, TAB_SWITCH, etc.

    @Column(name = "meta_description", columnDefinition = "TEXT")
    private String metaDescription;

    @Column(name = "timestamp_offset", nullable = false, length = 10)
    private String timestampOffset; // e.g. '12:15'

    @Column(name = "snapshot_url", columnDefinition = "TEXT")
    private String snapshotUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
