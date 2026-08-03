package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.oryfolks.certify.enums.CompetencyLevel;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Represents a competency band associated with an exam.
 *
 * Example:
 * L1 -> Expert -> 90-100
 * L2 -> Advanced -> 75-89
 * L3 -> Intermediate -> 60-74
 * L4 -> Beginner -> 40-59
 * L5 -> Needs Improvement -> 0-39
 */
@Entity
@Table(name = "competency_bands")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "exam")
public class CompetencyBand {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    @JsonIgnore
    private Exam exam;

    @NotNull(message = "Competency level is required.")
    @Enumerated(EnumType.STRING)
    @Column(name = "level_name", nullable = false, length = 10)
    private CompetencyLevel levelName;

    @NotBlank(message = "Competency title is required.")
    @Column(name = "title", nullable = false, length = 50)
    private String title;

    @NotNull(message = "Minimum score is required.")
    @Min(value = 0, message = "Minimum score cannot be negative.")
    @Max(value = 100, message = "Minimum score cannot exceed 100.")
    @Column(name = "min_score", nullable = false)
    private Integer minScore;

    @NotNull(message = "Maximum score is required.")
    @Min(value = 0, message = "Maximum score cannot be negative.")
    @Max(value = 100, message = "Maximum score cannot exceed 100.")
    @Column(name = "max_score", nullable = false)
    private Integer maxScore;

}