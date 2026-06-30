package com.oryfolks.certify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exam_attempts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"violations"})
public class ExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    private Integer score;

    @Column(name = "assigned_level", length = 10)
    private String assignedLevel; // L1, L2, L3, L4, L5

    @Column(name = "result_status", nullable = false, length = 20)
    private String resultStatus; // PASSED, NOT_PASSED, TERMINATED, IN_PROGRESS

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "tab_switch_count")
    @Builder.Default
    private Integer tabSwitchCount = 0;

    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<IntegrityViolation> violations = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
