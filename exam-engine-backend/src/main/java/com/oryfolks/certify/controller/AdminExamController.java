package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.*;
import com.oryfolks.certify.repository.*;
import com.oryfolks.certify.response.ApiResponse;
import com.oryfolks.certify.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/admin/exams")
public class AdminExamController {

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private CompetencyBandRepository bandRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private ExamAttemptRepository examAttemptRepository;

    @Autowired
    private ExamAttemptQuestionRepository examAttemptQuestionRepository;

    @Autowired
    private AttemptAnswerRepository attemptAnswerRepository;

    @Autowired
    private AnswerRepository answerRepository;

    @Autowired
    private IntegrityViolationRepository integrityViolationRepository;

    @Autowired
    private ExamViolationRepository examViolationRepository;

    @Autowired
    private AIFlagRepository aiFlagRepository;

    @Autowired
    private RecordingSessionRepository recordingSessionRepository;
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExams(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String status) {

        List<Exam> exams = examRepository.findAll();
        if (exams == null) exams = new ArrayList<>();
        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            exams = exams.stream().filter(e -> e != null && e.getTitle() != null && e.getTitle().toLowerCase().contains(query)).toList();
        }
        if (stack != null && !stack.isBlank()) {
            exams = exams.stream().filter(e -> e != null && e.getStack() != null && e.getStack().equalsIgnoreCase(stack)).toList();
        }
        if (status != null && !status.isBlank()) {
            exams = exams.stream().filter(e -> e != null && e.getStatus() != null && e.getStatus().name().equalsIgnoreCase(status)).toList();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Exam e : exams) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("title", e.getTitle());
            map.put("stack", e.getStack());
            map.put("durationMinutes", e.getDurationMinutes());
            map.put("durationMin", e.getDurationMinutes());
            map.put("questionPool", e.getQuestionPool());
            map.put("questionPoolSize", e.getQuestionPool());
            map.put("perAttempt", e.getPerAttempt());
            map.put("questionsPerAttempt", e.getPerAttempt());
            map.put("passMark", e.getPassMark());
            map.put("instructions", e.getInstructions());
            map.put("version", e.getVersion());
            map.put("status", e.getStatus() != null ? e.getStatus().name() : "DRAFT");
            map.put("totalMarks", e.getTotalMarks() != null ? e.getTotalMarks() : 100);
            map.put("difficultyMode", e.getDifficultyMode() != null ? e.getDifficultyMode() : "NONE");
            map.put("beginnerPct", e.getBeginnerPct());
            map.put("intermediatePct", e.getIntermediatePct());
            map.put("advancedPct", e.getAdvancedPct());
            map.put("createdAt", e.getCreatedAt());
            map.put("updatedAt", e.getUpdatedAt());

            long activeCount = questionRepository.countByExamIdAndIsActiveTrue(e.getId());
            if (activeCount == 0) {
                activeCount = questionRepository.countByExamId(e.getId());
            }
            int poolSize = e.getQuestionPool() != null ? e.getQuestionPool() : 0;
            long remaining = Math.max(0, poolSize - activeCount);
            boolean eligible = activeCount >= poolSize && poolSize > 0;

            map.put("currentQuestionCount", activeCount);
            map.put("remainingQuestionsNeeded", remaining);
            map.put("isActivationEligible", eligible);

            rows.add(map);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", rows);
        result.put("total", rows.size());
        return ResponseEntity.ok(ApiResponse.success("Exams retrieved", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExam(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        long activeCount = questionRepository.countByExamIdAndIsActiveTrue(exam.getId());
        if (activeCount == 0) {
            activeCount = questionRepository.countByExamId(exam.getId());
        }
        int poolSize = exam.getQuestionPool() != null ? exam.getQuestionPool() : 0;
        long remaining = Math.max(0, poolSize - activeCount);
        boolean eligible = activeCount >= poolSize && poolSize > 0;

        // Breakdown counts
        List<Question> activeQuestions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
        long beginnerQuestionCount = 0;
        long intermediateQuestionCount = 0;
        long advancedQuestionCount = 0;
        for (Question q : activeQuestions) {
            String diff = q.getDifficulty() != null ? q.getDifficulty().trim().toUpperCase() : "EASY";
            if ("HARD".equals(diff)) {
                advancedQuestionCount++;
            } else if ("MEDIUM".equals(diff)) {
                intermediateQuestionCount++;
            } else {
                beginnerQuestionCount++;
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("beginnerQuestionCount", beginnerQuestionCount);
        map.put("intermediateQuestionCount", intermediateQuestionCount);
        map.put("advancedQuestionCount", advancedQuestionCount);
        map.put("id", exam.getId());
        map.put("title", exam.getTitle());
        map.put("stack", exam.getStack());
        map.put("durationMinutes", exam.getDurationMinutes());
        map.put("durationMin", exam.getDurationMinutes());
        map.put("questionPool", exam.getQuestionPool());
        map.put("questionPoolSize", exam.getQuestionPool());
        map.put("perAttempt", exam.getPerAttempt());
        map.put("questionsPerAttempt", exam.getPerAttempt());
        map.put("passMark", exam.getPassMark());
        map.put("instructions", exam.getInstructions());
        map.put("version", exam.getVersion());
        map.put("status", exam.getStatus() != null ? exam.getStatus().name() : "DRAFT");
        map.put("totalMarks", exam.getTotalMarks() != null ? exam.getTotalMarks() : 100);
        map.put("difficultyMode", exam.getDifficultyMode() != null ? exam.getDifficultyMode() : "NONE");
        map.put("beginnerPct", exam.getBeginnerPct());
        map.put("intermediatePct", exam.getIntermediatePct());
        map.put("advancedPct", exam.getAdvancedPct());
        map.put("createdAt", exam.getCreatedAt());
        map.put("updatedAt", exam.getUpdatedAt());
        map.put("currentQuestionCount", activeCount);
        map.put("remainingQuestionsNeeded", remaining);
        map.put("isActivationEligible", eligible);

        return ResponseEntity.ok(ApiResponse.success("Exam details retrieved", map));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Exam>> createExam(@RequestBody Exam exam, Principal principal) {
        if (exam.getStatus() == null) exam.setStatus(ExamStatus.ACTIVE);
        if (exam.getVersion() == null) exam.setVersion("1");

        // Sync field aliases
        if (exam.getDurationMinutes() == null && exam.getDurationMin() != null) {
            exam.setDurationMinutes(exam.getDurationMin());
        }
        if (exam.getQuestionPool() == null && exam.getQuestionPoolSize() != null) {
            exam.setQuestionPool(exam.getQuestionPoolSize());
        }
        if (exam.getPerAttempt() == null && exam.getQuestionsPerAttempt() != null) {
            exam.setPerAttempt(exam.getQuestionsPerAttempt());
        }

        validateDifficultyDistribution(exam);
        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("CREATE_EXAM")
                .module("Exams Library")
                .oldValue("-")
                .newValue(saved.getTitle() != null ? saved.getTitle() : "New Exam")
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam created successfully", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Exam>> updateExam(
            @PathVariable UUID id,
            @RequestBody Exam payload,
            Principal principal) {

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        if (payload.getTitle() != null) exam.setTitle(payload.getTitle());
        if (payload.getStack() != null) exam.setStack(payload.getStack());
        if (payload.getDurationMinutes() != null) exam.setDurationMinutes(payload.getDurationMinutes());
        else if (payload.getDurationMin() != null) exam.setDurationMinutes(payload.getDurationMin());

        if (payload.getPassMark() != null) exam.setPassMark(payload.getPassMark());

        if (payload.getQuestionPool() != null) exam.setQuestionPool(payload.getQuestionPool());
        else if (payload.getQuestionPoolSize() != null) exam.setQuestionPool(payload.getQuestionPoolSize());

        if (payload.getPerAttempt() != null) exam.setPerAttempt(payload.getPerAttempt());
        else if (payload.getQuestionsPerAttempt() != null) exam.setPerAttempt(payload.getQuestionsPerAttempt());

        if (payload.getTotalMarks() != null) exam.setTotalMarks(payload.getTotalMarks());

        if (payload.getInstructions() != null) exam.setInstructions(payload.getInstructions());

        if (payload.getDifficultyMode() != null) exam.setDifficultyMode(payload.getDifficultyMode());
        exam.setBeginnerPct(payload.getBeginnerPct());
        exam.setIntermediatePct(payload.getIntermediatePct());
        exam.setAdvancedPct(payload.getAdvancedPct());

        validateDifficultyDistribution(exam);
        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("EDIT_EXAM_METADATA")
                .module("Exams Library")
                .oldValue("-")
                .newValue(saved.getTitle() != null ? saved.getTitle() : "Exam Metadata")
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam updated successfully", saved));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ApiResponse<Exam>> duplicateExam(@PathVariable UUID id, Principal principal) {
        Exam src = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        Exam copy = Exam.builder()
                .title(src.getTitle() + " (Copy)")
                .stack(src.getStack())
                .durationMinutes(src.getDurationMinutes())
                .questionPool(src.getQuestionPool())
                .perAttempt(src.getPerAttempt())
                .passMark(src.getPassMark())
                .totalMarks(src.getTotalMarks())
                .instructions(src.getInstructions())
                .difficultyMode(src.getDifficultyMode())
                .beginnerPct(src.getBeginnerPct())
                .intermediatePct(src.getIntermediatePct())
                .advancedPct(src.getAdvancedPct())
                .version("1")
                .status(ExamStatus.DRAFT)
                .build();

        Exam savedCopy = examRepository.save(copy);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("DUPLICATE_EXAM")
                .module("Exams Library")
                .oldValue(src.getTitle())
                .newValue(savedCopy.getTitle())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam duplicated", savedCopy));
    }

    @GetMapping("/{id}/bands")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, int[]>>> getBands(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        List<CompetencyBand> bands = bandRepository.findByExamId(id);
        if (bands.isEmpty()) {
            bands = new ArrayList<>();
            bands.add(CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L1).title("Expert").minScore(90).maxScore(100).build());
            bands.add(CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L2).title("Advanced").minScore(75).maxScore(89).build());
            bands.add(CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L3).title("Intermediate").minScore(60).maxScore(74).build());
            bands.add(CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L4).title("Beginner").minScore(40).maxScore(59).build());
            bands.add(CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L5).title("Needs Training").minScore(0).maxScore(39).build());
            bandRepository.saveAll(bands);
        }

        Map<String, int[]> map = new LinkedHashMap<>();
        for (CompetencyBand b : bands) {
            map.put(b.getLevelName().name(), new int[]{b.getMinScore(), b.getMaxScore()});
        }
        return ResponseEntity.ok(ApiResponse.success("Bands retrieved", map));
    }

    @PutMapping("/{id}/bands")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, int[]>>> saveBands(
            @PathVariable UUID id,
            @RequestBody Map<String, List<Integer>> payload,
            Principal principal) {

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        bandRepository.deleteByExamId(id);

        List<CompetencyBand> bandList = new ArrayList<>();
        for (Map.Entry<String, List<Integer>> entry : payload.entrySet()) {
            String lvlStr = entry.getKey();
            List<Integer> range = entry.getValue();

            CompetencyLevel lvl = CompetencyLevel.valueOf(lvlStr);
            int min = (range != null && range.size() > 0) ? range.get(0) : 0;
            int max = (range != null && range.size() > 1) ? range.get(1) : 100;
            String title = lvlStr + " Competency";

            bandList.add(CompetencyBand.builder()
                    .exam(exam)
                    .levelName(lvl)
                    .title(title)
                    .minScore(min)
                    .maxScore(max)
                    .build());
        }

        bandRepository.saveAll(bandList);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("UPDATE_DIFFICULTY_BANDS")
                .module("Authoring")
                .oldValue("-")
                .newValue("Updated Bands for " + exam.getTitle())
                .build());

        Map<String, int[]> responseMap = new LinkedHashMap<>();
        for (CompetencyBand b : bandList) {
            responseMap.put(b.getLevelName().name(), new int[]{b.getMinScore(), b.getMaxScore()});
        }

        return ResponseEntity.ok(ApiResponse.success("Bands saved successfully", responseMap));
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestActivation(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        try {
            Exam exam = examRepository.findById(id)
                    .orElseThrow(() -> new com.oryfolks.certify.exception.ResourceNotFoundException("Exam not found with id: " + id));

            long activeCount = questionRepository.countByExamIdAndIsActiveTrue(exam.getId());
            if (activeCount == 0) {
                activeCount = questionRepository.countByExamId(exam.getId());
            }
            int poolSize = exam.getQuestionPool() != null ? exam.getQuestionPool() : 0;
            if (activeCount < poolSize) {
                long remaining = poolSize - activeCount;
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error(String.format(
                            "Cannot activate exam. Required Question Pool Size is %d, but currently only %d question(s) are assigned to this exam. %d more question(s) must be added before activation.",
                            poolSize, activeCount, remaining
                        )));
            }

            if (approvalRepository.findFirstByTargetIdAndStatus(id.toString(), "PENDING").isPresent()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("An approval request is already pending for this exam."));
            }

            String note = body != null ? body.getOrDefault("note", "") : "";

            ApprovalRequest req = ApprovalRequest.builder()
                    .type("EXAM_ACTIVATE")
                    .label("Activate exam · " + exam.getTitle())
                    .targetId(id.toString())
                    .requestedBy(principal != null && principal.getName() != null ? principal.getName() : "Admin User")
                    .note(note)
                    .status("PENDING")
                    .requestedAt(java.time.LocalDateTime.now())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();

            ApprovalRequest saved = approvalRepository.save(req);

            Map<String, Object> res = new HashMap<>();
            res.put("ok", true);
            res.put("approval", saved);
            return ResponseEntity.ok(ApiResponse.success("Activation approval requested", res));
        } catch (com.oryfolks.certify.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to request activation: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestDeactivation(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {
        try {
            Exam exam = examRepository.findById(id)
                    .orElseThrow(() -> new com.oryfolks.certify.exception.ResourceNotFoundException("Exam not found with id: " + id));

            if (approvalRepository.findFirstByTargetIdAndStatus(id.toString(), "PENDING").isPresent()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("An approval request is already pending for this exam."));
            }

            String note = body != null ? body.getOrDefault("note", "") : "";

            ApprovalRequest req = ApprovalRequest.builder()
                    .type("EXAM_DEACTIVATE")
                    .label("Deactivate exam · " + exam.getTitle())
                    .targetId(id.toString())
                    .requestedBy(principal != null && principal.getName() != null ? principal.getName() : "Admin User")
                    .note(note)
                    .status("PENDING")
                    .requestedAt(java.time.LocalDateTime.now())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();

            ApprovalRequest saved = approvalRepository.save(req);

            Map<String, Object> res = new HashMap<>();
            res.put("ok", true);
            res.put("approval", saved);
            return ResponseEntity.ok(ApiResponse.success("Deactivation approval requested", res));
        } catch (com.oryfolks.certify.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to request deactivation: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getVersions(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        List<Map<String, Object>> versions = new ArrayList<>();
        Map<String, Object> v1 = new HashMap<>();
        v1.put("id", "v-" + id + "-1");
        v1.put("examId", id);
        v1.put("version", Integer.parseInt(exam.getVersion()));
        v1.put("publishedAt", exam.getCreatedAt() != null ? exam.getCreatedAt().toString() : new Date().toString());
        v1.put("publishedBy", "System Admin");
        v1.put("notes", "Initial exam build");
        versions.add(v1);

        return ResponseEntity.ok(ApiResponse.success("Versions retrieved", versions));
    }

    @PostMapping("/{id}/versions/publish")
    public ResponseEntity<ApiResponse<Exam>> publishVersion(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        int currentVer = 1;
        try { currentVer = Integer.parseInt(exam.getVersion()); } catch (Exception ignored) {}
        exam.setVersion(String.valueOf(currentVer + 1));

        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("PUBLISH_VERSION")
                .module("Authoring")
                .oldValue("v" + currentVer)
                .newValue("v" + exam.getVersion())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Published v" + exam.getVersion(), saved));
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<Exam>> archiveExam(@PathVariable UUID id, Principal principal) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        exam.setStatus(ExamStatus.INACTIVE);
        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("ARCHIVE_EXAM")
                .module("Exams Library")
                .oldValue("-")
                .newValue(saved.getId().toString())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam archived successfully", saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> deleteExam(@PathVariable UUID id, Principal principal) {
        // 1. Delete all attempt related data for this exam
        List<ExamAttempt> attempts = examAttemptRepository.findByExamId(id);
        for (ExamAttempt attempt : attempts) {
            examAttemptQuestionRepository.deleteByAttemptId(attempt.getId());
            attemptAnswerRepository.deleteByAttemptId(attempt.getId());
            answerRepository.deleteByAttemptId(attempt.getId());
            integrityViolationRepository.deleteByAttemptId(attempt.getId());
            examViolationRepository.deleteByAttemptId(attempt.getId());
            aiFlagRepository.deleteByAttemptId(attempt.getId());
            recordingSessionRepository.deleteByAttemptId(attempt.getId());
        }
        if (!attempts.isEmpty()) {
            examAttemptRepository.deleteAll(attempts);
        }

        // 2. Delete questions
        List<Question> questions = questionRepository.findByExamId(id);
        if (!questions.isEmpty()) {
            questionRepository.deleteAll(questions);
        }

        // 3. Delete sections
        List<Section> sections = sectionRepository.findByExamId(id);
        if (!sections.isEmpty()) {
            sectionRepository.deleteAll(sections);
        }

        // 4. Delete competency bands
        bandRepository.deleteByExamId(id);

        // 5. Delete approval requests
        approvalRepository.deleteByTargetId(id.toString());

        // 6. Delete exam entity
        examRepository.deleteById(id);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("DELETE_EXAM")
                .module("Exams Library")
                .oldValue(id.toString())
                .newValue("-")
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam deleted successfully", Map.of("ok", true)));
    }

    private void validateDifficultyDistribution(Exam exam) {
        if ("MANUAL".equalsIgnoreCase(exam.getDifficultyMode())) {
            Integer b = exam.getBeginnerPct();
            Integer i = exam.getIntermediatePct();
            Integer a = exam.getAdvancedPct();
            if (b == null || i == null || a == null) {
                throw new BadRequestException("Percentages for Beginner, Intermediate, and Advanced must be defined for Manual Distribution.");
            }
            if (b < 0 || b > 100 || i < 0 || i > 100 || a < 0 || a > 100) {
                throw new BadRequestException("Difficulty percentages must be between 0 and 100.");
            }
            if (b + i + a != 100) {
                throw new BadRequestException("Total distribution percentage must equal exactly 100% (currently " + (b + i + a) + "%).");
            }
        }
    }
}
