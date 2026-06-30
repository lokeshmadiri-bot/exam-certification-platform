package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.repository.CompetencyBandRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private CompetencyBandRepository competencyBandRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Exam>>> getAllExams() {
        List<Exam> exams = examRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success("Exams fetched successfully", exams));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Exam>> getExamById(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Exam details fetched successfully", exam));
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<List<Question>>> getQuestionsForExam(@PathVariable UUID id) {
        List<Question> questions = questionRepository.findByExamId(id);
        return ResponseEntity.ok(ApiResponse.success("Questions fetched successfully", questions));
    }

    @PostMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Exam>> createExam(@RequestBody Exam exam) {
        // Link competency bands to the exam
        if (exam.getCompetencyBands() != null) {
            for (CompetencyBand band : exam.getCompetencyBands()) {
                band.setExam(exam);
            }
        }
        Exam savedExam = examRepository.save(exam);
        return ResponseEntity.ok(ApiResponse.success("Exam created successfully", savedExam));
    }

    @PostMapping("/{id}/questions")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Question>> addQuestion(@PathVariable UUID id, @RequestBody Question question) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        question.setExam(exam);
        Question savedQuestion = questionRepository.save(question);
        return ResponseEntity.ok(ApiResponse.success("Question added successfully", savedQuestion));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<Exam>> updateExamStatus(@PathVariable UUID id, @RequestParam String status) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        exam.setStatus(status.toUpperCase());
        Exam saved = examRepository.save(exam);
        return ResponseEntity.ok(ApiResponse.success("Exam status updated", saved));
    }
}
