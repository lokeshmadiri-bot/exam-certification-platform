package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "competency_bands")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "exam")
public class CompetencyBand {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    @JsonIgnore
    private Exam exam;

    @Column(name = "level_name", nullable = false, length = 10)
    private String levelName; // e.g. L1, L2, L3, L4, L5

    @Column(nullable = false, length = 50)
    private String title; // e.g. Expert, Advanced

    @Column(name = "min_score", nullable = false)
    private Integer minScore;

    @Column(name = "max_score", nullable = false)
    private Integer maxScore;
}
