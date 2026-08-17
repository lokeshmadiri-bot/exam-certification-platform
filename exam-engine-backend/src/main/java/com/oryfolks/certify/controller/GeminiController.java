package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.*;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.response.ApiResponse;
import com.oryfolks.certify.service.impl.QuestionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * GeminiController
 *
 * POST /api/admin/questions/ai/generate    — call Gemini, return preview list (no DB)
 * POST /api/admin/questions/ai/save        — save approved questions to DB
 * POST /api/admin/questions/ai/regenerate  — regenerate a single question (no DB)
 */
@RestController
@RequestMapping("/api/admin/questions/ai")
@PreAuthorize("hasRole('ADMIN')")
public class GeminiController {

    private final QuestionService questionService;

    public GeminiController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<List<GeneratedQuestionDTO>>> generate(
            @Valid @RequestBody GenerateQuestionRequest request) {
        List<GeneratedQuestionDTO> questions = questionService.generateQuestions(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Generated " + questions.size() + " question(s) successfully", questions));
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<Object>> save(
            @RequestBody SaveGeneratedQuestionsRequest request) {
        try {
            List<Question> saved = questionService.saveGeneratedQuestions(request);
            Map<String, Object> result = new HashMap<>();
            result.put("saved", saved.size());
            result.put("rows", saved);
            return ResponseEntity.ok(ApiResponse.success(
                    "Saved " + saved.size() + " question(s) to the bank", result));
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("saved", 0);
            fallback.put("rows", List.of());
            return ResponseEntity.ok(ApiResponse.success("Failed to save questions: " + e.getMessage(), fallback));
        }
    }

    @PostMapping("/regenerate")
    public ResponseEntity<ApiResponse<GeneratedQuestionDTO>> regenerate(
            @RequestBody GeneratedQuestionDTO original) {
        GeneratedQuestionDTO regenerated = questionService.regenerateQuestion(original);
        return ResponseEntity.ok(ApiResponse.success("Question regenerated", regenerated));
    }
}
