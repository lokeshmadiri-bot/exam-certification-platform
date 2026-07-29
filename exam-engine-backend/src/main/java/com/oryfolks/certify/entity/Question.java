package com.oryfolks.certify.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "exam")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_id", nullable = true)
    @JsonIgnore
    private Exam exam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id")
    @JsonIgnore
    private Section section;

    @Column(name = "stack", length = 50)
    private String stack;

    @NotBlank(message = "Question text is required.")
    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "code_snippet", columnDefinition = "TEXT")
    private String codeSnippet;

    @Column(name = "topic", length = 100)
    private String topic;

    @Column(name = "type", length = 20)
    private String type;

    @Column(name = "level", length = 10)
    private String level;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @NotBlank(message = "Difficulty is required.")
    @Column(nullable = false, length = 20)
    private String difficulty;

    @Min(value = 1, message = "Marks should be at least 1.")
    @Column(nullable = false)
    private Integer marks;

    @NotBlank(message = "Correct option is required.")
    @Column(name = "correct_option", nullable = false, length = 1)
    private String correctOption;

    @NotBlank(message = "Option A is required.")
    @Column(name = "option_a", nullable = false, columnDefinition = "TEXT")
    private String optionA;

    @NotBlank(message = "Option B is required.")
    @Column(name = "option_b", nullable = false, columnDefinition = "TEXT")
    private String optionB;

    @NotBlank(message = "Option C is required.")
    @Column(name = "option_c", nullable = false, columnDefinition = "TEXT")
    private String optionC;

    @NotBlank(message = "Option D is required.")
    @Column(name = "option_d", nullable = false, columnDefinition = "TEXT")
    private String optionD;

    @Column(name = "language", length = 30)
    private String language;

    @Column(name = "sample_input", columnDefinition = "TEXT")
    private String sampleInput;

    @Column(name = "sample_output", columnDefinition = "TEXT")
    private String sampleOutput;

    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "model_answer", columnDefinition = "TEXT")
    private String modelAnswer;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "source", length = 20)
    private String source;

    @Column(name = "ai_model", length = 50)
    private String aiModel;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

}