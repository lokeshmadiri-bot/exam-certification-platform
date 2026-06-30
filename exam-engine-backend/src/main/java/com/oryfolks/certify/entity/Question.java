package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "questions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "exam")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = false)
    @JsonIgnore
    private Exam exam;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "code_snippet", columnDefinition = "TEXT")
    private String codeSnippet;

    @Column(nullable = false, length = 20)
    private String difficulty; // EASY, MEDIUM, HARD

    @Column(nullable = false)
    private Integer marks;

    @Column(name = "correct_option", nullable = false, length = 1)
    private String correctOption; // A, B, C, D

    @Column(name = "option_a", nullable = false, columnDefinition = "TEXT")
    private String optionA;

    @Column(name = "option_b", nullable = false, columnDefinition = "TEXT")
    private String optionB;

    @Column(name = "option_c", nullable = false, columnDefinition = "TEXT")
    private String optionC;

    @Column(name = "option_d", nullable = false, columnDefinition = "TEXT")
    private String optionD;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
