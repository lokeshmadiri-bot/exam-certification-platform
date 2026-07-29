package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.ApprovalRequest;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.ApprovalRequestRepository;
import com.oryfolks.certify.repository.CompetencyBandRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/admin/exams")
@PreAuthorize("hasRole('ADMIN')")
public class AdminExamController {

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private CompetencyBandRepository bandRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExams(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String stack,
            @RequestParam(required = false) String status) {

        List<Exam> exams = examRepository.findAll();
        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase();
            exams = exams.stream().filter(e -> e.getTitle().toLowerCase().contains(query)).toList();
        }
        if (stack != null && !stack.isBlank()) {
            exams = exams.stream().filter(e -> e.getStack().equalsIgnoreCase(stack)).toList();
        }
        if (status != null && !status.isBlank()) {
            exams = exams.stream().filter(e -> e.getStatus().name().equalsIgnoreCase(status)).toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", exams);
        result.put("total", exams.size());
        return ResponseEntity.ok(ApiResponse.success("Exams retrieved", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Exam>> getExam(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        return ResponseEntity.ok(ApiResponse.success("Exam details retrieved", exam));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Exam>> createExam(@RequestBody Exam exam, Principal principal) {
        if (exam.getStatus() == null) exam.setStatus(ExamStatus.DRAFT);
        if (exam.getVersion() == null) exam.setVersion("1");

        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("CREATE_EXAM")
                .module("Exams Library")
                .oldValue("-")
                .newValue(saved.getId().toString())
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
        if (payload.getPassMark() != null) exam.setPassMark(payload.getPassMark());
        if (payload.getQuestionPool() != null) exam.setQuestionPool(payload.getQuestionPool());
        if (payload.getPerAttempt() != null) exam.setPerAttempt(payload.getPerAttempt());
        if (payload.getInstructions() != null) exam.setInstructions(payload.getInstructions());

        Exam saved = examRepository.save(exam);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("EDIT_EXAM_METADATA")
                .module("Exams Library")
                .oldValue("-")
                .newValue(saved.getId().toString())
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
                .instructions(src.getInstructions())
                .version("1")
                .status(ExamStatus.DRAFT)
                .build();

        Exam savedCopy = examRepository.save(copy);

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("DUPLICATE_EXAM")
                .module("Exams Library")
                .oldValue(id.toString())
                .newValue(savedCopy.getId().toString())
                .build());

        return ResponseEntity.ok(ApiResponse.success("Exam duplicated", savedCopy));
    }

    @GetMapping("/{id}/bands")
    public ResponseEntity<ApiResponse<Map<String, int[]>>> getBands(@PathVariable UUID id) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        Map<String, int[]> map = new LinkedHashMap<>();
        List<CompetencyBand> bands = exam.getCompetencyBands();
        if (bands == null || bands.isEmpty()) {
            map.put("L1", new int[]{0, 20});
            map.put("L2", new int[]{21, 40});
            map.put("L3", new int[]{41, 60});
            map.put("L4", new int[]{61, 80});
            map.put("L5", new int[]{81, 100});
        } else {
            for (CompetencyBand b : bands) {
                map.put(b.getLevelName().name(), new int[]{b.getMinScore(), b.getMaxScore()});
            }
        }
        return ResponseEntity.ok(ApiResponse.success("Bands retrieved", map));
    }

    @PutMapping("/{id}/bands")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, int[]>>> saveBands(
            @PathVariable UUID id,
            @RequestBody Map<String, List<Integer>> bandsMap,
            Principal principal) {

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        bandRepository.deleteByExamId(id);

        List<CompetencyBand> bandList = new ArrayList<>();
        for (Map.Entry<String, List<Integer>> entry : bandsMap.entrySet()) {
            CompetencyLevel lvl = CompetencyLevel.valueOf(entry.getKey());
            List<Integer> range = entry.getValue();
            int min = range.get(0);
            int max = range.get(1);

            bandList.add(CompetencyBand.builder()
                    .exam(exam)
                    .levelName(lvl)
                    .title(lvl.name() + " Band")
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
                .newValue(id.toString())
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

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        String note = body != null ? body.getOrDefault("note", "") : "";

        ApprovalRequest req = ApprovalRequest.builder()
                .type("EXAM_ACTIVATE")
                .label("Activate exam · " + exam.getTitle())
                .targetId(id.toString())
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .build();

        ApprovalRequest saved = approvalRepository.save(req);

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("approval", saved);
        return ResponseEntity.ok(ApiResponse.success("Activation approval requested", res));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestDeactivation(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Principal principal) {

        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        String note = body != null ? body.getOrDefault("note", "") : "";

        ApprovalRequest req = ApprovalRequest.builder()
                .type("EXAM_DEACTIVATE")
                .label("Deactivate exam · " + exam.getTitle())
                .targetId(id.toString())
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .build();

        ApprovalRequest saved = approvalRepository.save(req);

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("approval", saved);
        return ResponseEntity.ok(ApiResponse.success("Deactivation approval requested", res));
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
}
