package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.GenerateQuestionRequest;
import com.oryfolks.certify.dto.GeneratedQuestionDTO;
import com.oryfolks.certify.dto.SaveGeneratedQuestionsRequest;
import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.repository.ExamAttemptQuestionRepository;
import com.oryfolks.certify.repository.AnswerRepository;
import com.oryfolks.certify.response.ApiResponse;
import com.oryfolks.certify.service.impl.GeminiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/admin/questions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminQuestionController {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private ExamAttemptQuestionRepository examAttemptQuestionRepository;

    @Autowired
    private AnswerRepository answerRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQuestions(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String status) {

        List<Question> questions;
        try {
            questions = questionRepository.findAllByOrderByCreatedAtDesc();
        } catch (Exception e) {
            try {
                questions = questionRepository.findAll();
            } catch (Exception ex) {
                questions = new ArrayList<>();
            }
        }

        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            questions = questions.stream().filter(item ->
                    (item.getQuestionText() != null && item.getQuestionText().toLowerCase().contains(query)) ||
                    (item.getTopic() != null && item.getTopic().toLowerCase().contains(query))
            ).toList();
        }
        if (stack != null && !stack.isBlank()) {
            questions = questions.stream().filter(item -> item.getStack() != null && item.getStack().equalsIgnoreCase(stack)).toList();
        }
        if (type != null && !type.isBlank()) {
            questions = questions.stream().filter(item -> item.getType() != null && item.getType().equalsIgnoreCase(type)).toList();
        }
        if (level != null && !level.isBlank()) {
            questions = questions.stream().filter(item -> item.getLevel() != null && item.getLevel().equalsIgnoreCase(level)).toList();
        }
        if (status != null && !status.isBlank()) {
            questions = questions.stream().filter(item ->
                (item.getStatus() != null && item.getStatus().equalsIgnoreCase(status)) ||
                (status.equalsIgnoreCase("ACTIVE") && Boolean.TRUE.equals(item.getIsActive()))
            ).toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", questions);
        result.put("total", questions.size());
        return ResponseEntity.ok(ApiResponse.success("Questions retrieved", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Question>> getQuestion(@PathVariable UUID id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Question retrieved", question));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Question>> createQuestion(@RequestBody Question question, Principal principal) {
        if (question.getStatus() == null) question.setStatus("ACTIVE");
        question.setIsActive("ACTIVE".equalsIgnoreCase(question.getStatus()));
        if (question.getSource() == null) question.setSource("MANUAL");

        if (question.getExam() != null && question.getExam().getId() != null) {
            Exam exam = examRepository.findById(question.getExam().getId()).orElse(null);
            question.setExam(exam);
        } else {
            List<Exam> allExams = examRepository.findAll();
            if (!allExams.isEmpty()) {
                question.setExam(allExams.get(0));
            }
        }

        Question saved = questionRepository.save(question);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("CREATE_QUESTION")
                .module("Question Bank")
                .oldValue("-")
                .newValue(saved.getId().toString())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Question created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Question>> updateQuestion(
            @PathVariable UUID id,
            @RequestBody Question payload,
            Principal principal) {

        Question existing = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found: " + id));

        if (payload.getExam() != null && payload.getExam().getId() != null) {
            Exam exam = examRepository.findById(payload.getExam().getId()).orElse(null);
            if (exam != null) existing.setExam(exam);
        }
        if (payload.getQuestionText() != null) existing.setQuestionText(payload.getQuestionText());
        if (payload.getStack() != null) existing.setStack(payload.getStack());
        if (payload.getTopic() != null) existing.setTopic(payload.getTopic());
        if (payload.getType() != null) existing.setType(payload.getType());
        if (payload.getLevel() != null) existing.setLevel(payload.getLevel());
        if (payload.getDifficulty() != null) existing.setDifficulty(payload.getDifficulty());
        if (payload.getMarks() != null) existing.setMarks(payload.getMarks());
        if (payload.getStatus() != null) {
            existing.setStatus(payload.getStatus());
            existing.setIsActive("ACTIVE".equalsIgnoreCase(payload.getStatus()));
        }
        if (payload.getIsActive() != null) {
            existing.setIsActive(payload.getIsActive());
            existing.setStatus(Boolean.TRUE.equals(payload.getIsActive()) ? "ACTIVE" : "INACTIVE");
        }
        if (payload.getOptionA() != null) existing.setOptionA(payload.getOptionA());
        if (payload.getOptionB() != null) existing.setOptionB(payload.getOptionB());
        if (payload.getOptionC() != null) existing.setOptionC(payload.getOptionC());
        if (payload.getOptionD() != null) existing.setOptionD(payload.getOptionD());
        if (payload.getCorrectOption() != null) existing.setCorrectOption(payload.getCorrectOption());
        if (payload.getCodeSnippet() != null) existing.setCodeSnippet(payload.getCodeSnippet());
        if (payload.getLanguage() != null) existing.setLanguage(payload.getLanguage());

        Question saved = questionRepository.save(existing);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("EDIT_QUESTION")
                .module("Question Bank")
                .oldValue("-")
                .newValue(saved.getId().toString())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Question updated", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> deleteQuestion(@PathVariable UUID id, Principal principal) {
        Question q = questionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Question not found: " + id));

        boolean usedInAttempt = false;
        try {
            if (examAttemptQuestionRepository.existsByQuestionId(id)) {
                usedInAttempt = true;
            }
        } catch (Exception ignored) {}
        try {
            if (answerRepository.existsByQuestionId(id)) {
                usedInAttempt = true;
            }
        } catch (Exception ignored) {}

        if (usedInAttempt) {
            q.setIsActive(false);
            q.setStatus("INACTIVE");
            questionRepository.save(q);
        } else {
            questionRepository.delete(q);
        }

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("DELETE_QUESTION")
                .module("Question Bank")
                .oldValue(id.toString())
                .newValue(usedInAttempt ? "SOFT_DELETED" : "PHYSICALLY_DELETED")
                .build());

        Map<String, Boolean> res = new HashMap<>();
        res.put("ok", true);
        return ResponseEntity.ok(ApiResponse.success(usedInAttempt ? "Question set to INACTIVE (soft-deleted)" : "Question physically deleted", res));
    }

    @PostMapping("/bulk-delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDelete(
            @RequestBody Map<String, Object> body,
            Principal principal) {

        List<String> idsStr = (List<String>) body.get("ids");
        int deletedCount = 0;
        int softDeletedCount = 0;

        if (idsStr != null) {
            for (String idStr : idsStr) {
                try {
                    UUID id = UUID.fromString(idStr);
                    Optional<Question> opt = questionRepository.findById(id);
                    if (opt.isPresent()) {
                        Question q = opt.get();
                        boolean usedInAttempt = false;
                        try {
                            if (examAttemptQuestionRepository.existsByQuestionId(id)) {
                                usedInAttempt = true;
                            }
                        } catch (Exception ignored) {}
                        try {
                            if (answerRepository.existsByQuestionId(id)) {
                                usedInAttempt = true;
                            }
                        } catch (Exception ignored) {}

                        if (usedInAttempt) {
                            q.setIsActive(false);
                            q.setStatus("INACTIVE");
                            questionRepository.save(q);
                            softDeletedCount++;
                        } else {
                            questionRepository.delete(q);
                            deletedCount++;
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("BULK_DELETE_QUESTIONS")
                .module("Question Bank")
                .oldValue((deletedCount + softDeletedCount) + " items")
                .newValue("Deleted: " + deletedCount + ", Soft Deleted: " + softDeletedCount)
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("deleted", deletedCount);
        res.put("softDeleted", softDeletedCount);
        return ResponseEntity.ok(ApiResponse.success("Bulk delete completed", res));
    }

    @RequestMapping(value = "/bulk", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkUpdate(
            @RequestBody Map<String, Object> body,
            Principal principal) {

        List<String> idsStr = (List<String>) body.get("ids");
        Map<String, Object> patch = (Map<String, Object>) body.get("patch");

        int updatedCount = 0;
        if (idsStr != null && patch != null) {
            for (String idStr : idsStr) {
                try {
                    UUID id = UUID.fromString(idStr);
                    Optional<Question> opt = questionRepository.findById(id);
                    if (opt.isPresent()) {
                        Question q = opt.get();
                        if (patch.containsKey("status")) {
                            String st = patch.get("status").toString();
                            q.setStatus(st);
                            q.setIsActive("ACTIVE".equalsIgnoreCase(st));
                        }
                        if (patch.containsKey("isActive")) {
                            boolean act = Boolean.parseBoolean(patch.get("isActive").toString());
                            q.setIsActive(act);
                            q.setStatus(act ? "ACTIVE" : "INACTIVE");
                        }
                        questionRepository.save(q);
                        updatedCount++;
                    }
                } catch (Exception ignored) {}
            }
        }

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("BULK_UPDATE_QUESTIONS")
                .module("Question Bank")
                .oldValue(updatedCount + " items")
                .newValue(patch != null ? patch.toString() : "-")
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("updated", updatedCount);
        return ResponseEntity.ok(ApiResponse.success("Bulk update completed", res));
    }
}
