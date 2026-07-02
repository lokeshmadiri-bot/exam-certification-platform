package com.oryfolks.certify.entity;

import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.enums.ResultStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Represents a candidate's attempt for an exam.
 *
 * Each attempt stores:
 * - Candidate
 * - Exam
 * - Score
 * - Assigned competency level
 * - Result status
 * - Start/End timestamps
 * - Integrity violations
 */
@Entity
@Table(name = "exam_attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = { "candidate", "exam", "violations" })
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @NotNull(message = "Candidate is required.")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @NotNull(message = "Exam is required.")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    @Min(value = 0, message = "Score cannot be negative.")
    @Max(value = 100, message = "Score cannot exceed 100.")
    @Column(name = "score")
    private Integer score;

    @Enumerated(EnumType.STRING)
    @Column(name = "assigned_level", length = 10)
    private CompetencyLevel assignedLevel;

    @NotNull(message = "Result status is required.")
    @Enumerated(EnumType.STRING)
    @Column(name = "result_status", nullable = false, length = 30)
    private ResultStatus resultStatus;

    @NotNull(message = "Start time is required.")
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Builder.Default
    @Min(value = 0)
    @Column(name = "tab_switch_count")
    private Integer tabSwitchCount = 0;

    @Builder.Default
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<IntegrityViolation> violations = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

}