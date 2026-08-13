package com.oryfolks.certify.entity;

import com.oryfolks.certify.enums.ExamStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "competencyBands")
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @NotBlank(message = "Exam title is required.")
    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @NotBlank(message = "Technology stack is required.")
    @Column(name = "stack", nullable = false, length = 50)
    private String stack;

    @NotNull(message = "Duration is required.")
    @Min(value = 1, message = "Duration must be greater than 0.")
    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @NotNull(message = "Question pool size is required.")
    @Min(value = 1, message = "Question pool must be greater than 0.")
    @Column(name = "question_pool", nullable = false)
    private Integer questionPool;

    @NotNull(message = "Maximum attempts are required.")
    @Min(value = 1, message = "Attempts must be at least 1.")
    @Column(name = "per_attempt", nullable = false)
    private Integer perAttempt;

    @NotNull(message = "Pass mark is required.")
    @Min(value = 0, message = "Pass mark cannot be negative.")
    @Max(value = 100, message = "Pass mark cannot exceed 100.")
    @Column(name = "pass_mark", nullable = false)
    private Integer passMark;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @NotBlank(message = "Version is required.")
    @Column(name = "version", nullable = false, length = 10)
    @Builder.Default
    private String version = "1";

    @NotNull(message = "Exam status is required.")
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ExamStatus status = ExamStatus.DRAFT;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("exam")
    @Builder.Default
    private List<CompetencyBand> competencyBands = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Frontend compatibility alias methods
    public Integer getDurationMin() {
        return durationMinutes;
    }

    public void setDurationMin(Integer durationMin) {
        this.durationMinutes = durationMin;
    }

    public Integer getQuestionPoolSize() {
        return questionPool;
    }

    public void setQuestionPoolSize(Integer questionPoolSize) {
        this.questionPool = questionPoolSize;
    }

    public Integer getQuestionsPerAttempt() {
        return perAttempt;
    }

    public void setQuestionsPerAttempt(Integer questionsPerAttempt) {
        this.perAttempt = questionsPerAttempt;
    }
}