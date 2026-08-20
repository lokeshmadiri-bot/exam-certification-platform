package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.dto.AnswerSubmission;
import com.oryfolks.certify.dto.ViolationRequestDTO;
import com.oryfolks.certify.dto.ViolationResponseDTO;
import com.oryfolks.certify.dto.AnswerSyncDTO;
import com.oryfolks.certify.dto.SyncRequestDTO;
import com.oryfolks.certify.dto.AttemptStatusDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.*;
import com.oryfolks.certify.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.oryfolks.certify.service.ExamService;
import com.oryfolks.certify.dto.ExamCardResponseDTO;
import com.oryfolks.certify.dto.ExamDetailsResponseDTO;
import com.oryfolks.certify.dto.QuestionResponseDTO;
import com.oryfolks.certify.dto.AnswerSubmission;
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

import com.oryfolks.certify.entity.ExamAttemptQuestion;
import com.oryfolks.certify.repository.ExamAttemptQuestionRepository;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    @Autowired
    private ExamService examService;

    @Autowired
    private ExamRepository examRepository;

    @Autowired
    private CompetencyBandRepository competencyBandRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private ExamAttemptRepository examAttemptRepository;

    @Autowired
    private ExamAttemptQuestionRepository examAttemptQuestionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private AnswerRepository answerRepository;

    @Autowired
    private AttemptAnswerRepository attemptAnswerRepository;


    @Autowired
    private ExamViolationRepository examViolationRepository;
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamCardResponseDTO>>> getAllExams() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Exams fetched successfully.",
                        examService.getAvailableExams()
            )
        );
    }


    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamDetailsResponseDTO>> getExamById(
        @PathVariable UUID id) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Exam details fetched successfully.",
                        examService.getExamDetails(id)
                )
        );
    }


    @GetMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<List<QuestionResponseDTO>>> getQuestionsForExam(
        @PathVariable UUID id) {

    return ResponseEntity.ok(
            ApiResponse.success(
                    "Questions fetched successfully.",
                    examService.getQuestions(id)
            )
        );
    }


    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Exam>> createExam(
            @RequestBody Exam exam) {

        Exam savedExam = examService.createExam(exam);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Exam created successfully.",
                        savedExam));
    }


    @PostMapping("/{id}/questions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Question>> addQuestion(
            @PathVariable UUID id,
            @RequestBody Question question) {

        Question savedQuestion =
                examService.addQuestion(id, question);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Question added successfully.",
                        savedQuestion));
    }


    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Exam>> updateExamStatus(
            @PathVariable UUID id,
            @RequestParam String status) {

        Exam exam =
                examService.updateExamStatus(id, status);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Exam status updated successfully.",
                        exam));
    }



    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRunnerData(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        Exam exam = attempt.getExam();
        List<Section> sections = sectionRepository.findByExamId(exam.getId());
        List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository != null ? examAttemptQuestionRepository.findByAttemptIdOrderByQuestionOrderAsc(attemptId) : List.of();
        List<Question> questions;
        if (attemptQuestions != null && !attemptQuestions.isEmpty()) {
            questions = new ArrayList<>();
            for (ExamAttemptQuestion eq : attemptQuestions) {
                questions.add(eq.getQuestion());
            }
        } else {
            questions = fetchQuestionsForExam(exam);
        }
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attemptId);

        Map<String, String> answersMap = new HashMap<>();
        for (Answer ans : savedAnswers) {
            answersMap.put(ans.getQuestion().getId().toString(), ans.getSelectedOption());
        }

        Integer perAttemptVal = exam.getPerAttempt();
        if (perAttemptVal == null) {
            perAttemptVal = exam.getQuestionsPerAttempt();
        }
        int perAttempt = (perAttemptVal != null) ? perAttemptVal : 0;

        if (perAttempt > 0 && questions.size() > perAttempt) {
            Random rand = new Random(attemptId.getMostSignificantBits() ^ attemptId.getLeastSignificantBits());
            List<Question> shuffled = new ArrayList<>(questions);
            Collections.shuffle(shuffled, rand);
            
            List<Question> subset = new ArrayList<>();
            for (Question q : shuffled) {
                if (answersMap.containsKey(q.getId().toString())) {
                    subset.add(q);
                }
            }
            
            for (Question q : shuffled) {
                if (subset.size() >= perAttempt) {
                    break;
                }
                if (!subset.contains(q)) {
                    subset.add(q);
                }
            }
            questions = subset;
        }

        List<Map<String, Object>> sectionsData = new ArrayList<>();

        if (sections.isEmpty()) {
            Map<String, List<Map<String, Object>>> groupedQuestions = new LinkedHashMap<>();
            groupedQuestions.put("EASY", new ArrayList<>());
            groupedQuestions.put("MEDIUM", new ArrayList<>());
            groupedQuestions.put("HARD", new ArrayList<>());

            for (Question q : questions) {
                String diff = q.getDifficulty() != null ? q.getDifficulty().toUpperCase() : "EASY";
                List<Map<String, Object>> list = groupedQuestions.get(diff);
                if (list == null) {
                    list = new ArrayList<>();
                    groupedQuestions.put(diff, list);
                }
                
                Map<String, Object> qMap = new HashMap<>();
                qMap.put("id", q.getId());
                qMap.put("questionText", q.getQuestionText());
                qMap.put("codeSnippet", q.getCodeSnippet());
                qMap.put("difficulty", q.getDifficulty());
                qMap.put("marks", q.getMarks());
                qMap.put("optionA", q.getOptionA());
                qMap.put("optionB", q.getOptionB());
                qMap.put("optionC", q.getOptionC());
                qMap.put("optionD", q.getOptionD());
                list.add(qMap);
            }

            int sectionIdCounter = 1;
            for (Map.Entry<String, List<Map<String, Object>>> entry : groupedQuestions.entrySet()) {
                if (!entry.getValue().isEmpty()) {
                    Map<String, Object> sectionMap = new HashMap<>();
                    sectionMap.put("id", String.valueOf(sectionIdCounter++));
                    sectionMap.put("name", entry.getKey() + " Section");
                    sectionMap.put("questions", entry.getValue());
                    sectionsData.add(sectionMap);
                }
            }
        } else {
            for (Section sec : sections) {
                Map<String, Object> sectionMap = new HashMap<>();
                sectionMap.put("id", sec.getId());
                sectionMap.put("name", sec.getName());

                List<Map<String, Object>> qList = new ArrayList<>();
                for (Question q : questions) {
                    if (q.getSection() != null && q.getSection().getId().equals(sec.getId())) {
                        Map<String, Object> qMap = new HashMap<>();
                        qMap.put("id", q.getId());
                        qMap.put("questionText", q.getQuestionText());
                        qMap.put("codeSnippet", q.getCodeSnippet());
                        qMap.put("difficulty", q.getDifficulty());
                        qMap.put("marks", q.getMarks());
                        qMap.put("optionA", q.getOptionA());
                        qMap.put("optionB", q.getOptionB());
                        qMap.put("optionC", q.getOptionC());
                        qMap.put("optionD", q.getOptionD());
                        qList.add(qMap);
                    }
                }
                sectionMap.put("questions", qList);
                sectionsData.add(sectionMap);
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("attemptId", attempt.getId());
        data.put("examTitle", exam.getTitle());
        data.put("durationMin", exam.getDurationMin() != null ? exam.getDurationMin() : 45);
        data.put("sections", sectionsData);
        data.put("answers", answersMap);
        data.put("resultStatus", attempt.getResultStatus().toString());
        long strikeCount = examViolationRepository.countByAttemptId(attemptId);
        data.put("strikeCount", (int) strikeCount);

        return ResponseEntity.ok(ApiResponse.success("Runner details retrieved", data));
    }

    @GetMapping("/attempts/{attemptId}/timer")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRemainingTime(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        long remaining = 0;
        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && attempt.getStartTime() != null) {
            LocalDateTime expectedEndTime = attempt.getStartTime().plusMinutes(attempt.getExam().getDurationMinutes());
            remaining = Duration.between(LocalDateTime.now(), expectedEndTime).getSeconds();
            if (remaining < 0) remaining = 0;
        } else if (attempt.getEndTime() != null) {
            remaining = Duration.between(LocalDateTime.now(), attempt.getEndTime()).getSeconds();
            if (remaining < 0) remaining = 0;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("remainingSeconds", remaining);

        return ResponseEntity.ok(ApiResponse.success("Remaining time retrieved", response));
    }

    @PostMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveAnswer(
            @PathVariable UUID attemptId,
            @RequestBody AnswerSubmission submission) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        Question question = questionRepository.findById(submission.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Question not found"));

        String optionText = submission.getSelectedOption();
        if ((optionText == null || optionText.trim().isEmpty()) && submission.getOptionId() != null) {
            int opId = submission.getOptionId();
            if (opId == 1) optionText = "A";
            else if (opId == 2) optionText = "B";
            else if (opId == 3) optionText = "C";
            else if (opId == 4) optionText = "D";
        }

        Optional<Answer> existing = answerRepository.findByAttemptIdAndQuestionId(attemptId, submission.getQuestionId());
        
        Answer answer;
        if (existing.isPresent()) {
            answer = existing.get();
            answer.setSelectedOption(optionText);
        } else {
            answer = Answer.builder()
                    .attempt(attempt)
                    .question(question)
                    .selectedOption(optionText)
                    .build();
        }

        answerRepository.save(answer);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Answer Saved");

        return ResponseEntity.ok(ApiResponse.success("Answer saved successfully", response));
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<ApiResponse<ExamAttempt>> submitRunnerAttempt(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found"));

        if (attempt.getResultStatus() != ResultStatus.IN_PROGRESS) {
            return ResponseEntity.ok(ApiResponse.success("Exam was already submitted", attempt));
        }

        Exam exam = attempt.getExam();
        List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository != null ? examAttemptQuestionRepository.findByAttemptIdOrderByQuestionOrderAsc(attemptId) : List.of();
        List<Question> questions;
        if (attemptQuestions != null && !attemptQuestions.isEmpty()) {
            questions = new ArrayList<>();
            for (ExamAttemptQuestion eq : attemptQuestions) {
                questions.add(eq.getQuestion());
            }
        } else {
            questions = questionRepository.findByExamId(exam.getId());
            if (questions.isEmpty() && exam.getStack() != null && !exam.getStack().isBlank()) {
                questions = questionRepository.findByStackIgnoreCase(exam.getStack());
            }
            if (questions.isEmpty()) {
                questions = questionRepository.findByIsActiveTrue();
            }
        }
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attemptId);
        List<AttemptAnswer> savedAttemptAnswers = attemptAnswerRepository.findByAttemptId(attemptId);

        // Sum correct question marks dynamically based on difficulty weighting
        double correctMarksSum = 0;
        for (Question q : questions) {
            String correct = q.getCorrectOption() != null ? q.getCorrectOption().trim() : "";
            String selectedOption = null;

            Optional<AttemptAnswer> aaOpt = savedAttemptAnswers.stream()
                    .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                    .findFirst();
            if (aaOpt.isPresent() && aaOpt.get().getSelectedOption() != null) {
                selectedOption = aaOpt.get().getSelectedOption().trim();
            } else {
                Optional<Answer> aOpt = savedAnswers.stream()
                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                        .findFirst();
                if (aOpt.isPresent() && aOpt.get().getSelectedOption() != null) {
                    selectedOption = aOpt.get().getSelectedOption().trim();
                }
            }

            if (selectedOption != null && !correct.isEmpty() && correct.equalsIgnoreCase(selectedOption)) {
                correctMarksSum += exam.getQuestionMarks(q.getDifficulty(), questions);
            }
        }

        int finalScore = (int) Math.round(correctMarksSum);
        Integer totMarksVal = exam.getTotalMarks() != null ? exam.getTotalMarks() : 100;
        finalScore = Math.min(finalScore, totMarksVal);
        attempt.setScore(finalScore);
        attempt.setEndTime(LocalDateTime.now());

        int percentScore = totMarksVal > 0 ? (int) Math.round((correctMarksSum / totMarksVal) * 100) : 0;
        percentScore = Math.min(percentScore, 100);

        if (percentScore >= exam.getPassMark()) {
            attempt.setResultStatus(ResultStatus.PASSED);
            List<CompetencyBand> bands = competencyBandRepository.findByExamId(exam.getId());
            if (bands == null || bands.isEmpty()) {
                bands = new ArrayList<>();
                bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L1).minScore(90).maxScore(100).title("Expert").build());
                bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L2).minScore(75).maxScore(89).title("Advanced").build());
                bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L3).minScore(60).maxScore(74).title("Intermediate").build());
                bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L4).minScore(40).maxScore(59).title("Beginner").build());
                bands.add(CompetencyBand.builder().levelName(CompetencyLevel.L5).minScore(0).maxScore(39).title("Needs Improvement").build());
            }
            attempt.setAssignedLevel(com.oryfolks.certify.service.AttemptService.calculateLevel(percentScore, exam.getPassMark(), bands));
        } else {
            attempt.setResultStatus(ResultStatus.FAILED);
            attempt.setAssignedLevel(null);
        }

        // Archive answers to attempt_answers table for permanent admin audit trail
        archiveAnswers(attempt);

        ExamAttempt savedAttempt = examAttemptRepository.save(attempt);
        return ResponseEntity.ok(ApiResponse.success("Exam submitted successfully", savedAttempt));
    }

    @GetMapping("/attempts/{attemptId}/integrity")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getIntegritySettings(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        Map<String, Object> response = new HashMap<>();
        response.put("candidateName", attempt.getCandidate().getFullName());
        response.put("candidateId", attempt.getCandidate().getId().toString());
        response.put("examName", attempt.getExam().getTitle());
        response.put("watermarkEnabled", true);
        response.put("fullscreenRequired", true);

        return ResponseEntity.ok(ApiResponse.success("Integrity settings retrieved", response));
    }

    @PostMapping("/attempts/{attemptId}/violations")
    public ResponseEntity<ApiResponse<ViolationResponseDTO>> recordViolation(
            @PathVariable UUID attemptId,
            @RequestBody ViolationRequestDTO request) {
        
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        if (attempt.getResultStatus() != ResultStatus.IN_PROGRESS) {
            long count = examViolationRepository.countByAttemptId(attemptId);
            boolean isTerminated = (attempt.getResultStatus() == ResultStatus.TERMINATED);
            return ResponseEntity.ok(ApiResponse.success("Attempt is already completed or terminated",
                    new ViolationResponseDTO((int) count, isTerminated)));
        }

        long currentCount = examViolationRepository.countByAttemptId(attemptId);
        boolean isTimeout = request.getType() != null && (
            request.getType().endsWith("_TIMEOUT") || 
            request.getType().equalsIgnoreCase("MULTIPLE_FACES_TIMEOUT")
        );

        if (currentCount >= 3 && !isTimeout) {
            terminateAttemptInternal(attempt);
            return ResponseEntity.ok(ApiResponse.success("Violation limit exceeded, attempt terminated",
                    new ViolationResponseDTO(3, true)));
        }

        int strikeNumber = (int) currentCount + 1;

        LocalDateTime violationTime;
        try {
            violationTime = LocalDateTime.parse(request.getTimestamp());
        } catch (Exception e) {
            violationTime = LocalDateTime.now();
        }

        ExamViolation violation = ExamViolation.builder()
                .attempt(attempt)
                .type(request.getType())
                .strikeNumber(strikeNumber)
                .description(getReadableViolationDescription(request.getType()))
                .snapshotUrl(request.getSnapshotUrl())
                .createdAt(violationTime)
                .build();

        examViolationRepository.save(violation);

        boolean terminate = strikeNumber >= 4 || isTimeout;
        if (terminate) {
            terminateAttemptInternal(attempt);
        }

        return ResponseEntity.ok(ApiResponse.success("Violation recorded",
                new ViolationResponseDTO(strikeNumber, terminate)));
    }

    private String getReadableViolationDescription(String type) {
        if (type == null) return "Integrity Warning";
        switch (type.toUpperCase()) {
            case "WINDOW_BLUR":
                return "Window Focus Lost (Tab Switched / Minimised)";
            case "WINDOW_RESIZE":
                return "Browser Window Resized";
            case "TAB_SWITCH":
                return "Tab Switched";
            case "FULLSCREEN_EXIT":
                return "Fullscreen Mode Exited";
            case "MULTIPLE_FACES":
            case "MULTIPLE_FACE":
                return "Multiple Faces Detected";
            case "MULTIPLE_FACES_TIMEOUT":
                return "Multiple faces continuously detected for 60 seconds.";
            case "FACE_NOT_DETECTED":
                return "Candidate Not Visible / Out of Camera";
            case "FACE_NOT_DETECTED_TIMEOUT":
                return "No face/candidate detected for 60 seconds.";
            case "GAZE_AWAY":
                return "Candidate Gaze Away from Screen";
            case "SECOND_DEVICE":
            case "MOBILE_PHONE":
                return "Mobile Phone / Second Device Detected";
            case "MOBILE_PHONE_TIMEOUT":
                return "Mobile phone/second device continuously detected for 60 seconds.";
            case "VOICE_DETECTED":
                return "Voice Detected";
            default:
                return "Proctoring violation: " + type.replace("_", " ");
        }
    }

    @PostMapping("/attempts/{attemptId}/terminate")
    public ResponseEntity<ApiResponse<String>> terminateAttempt(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS) {
            terminateAttemptInternal(attempt);
        }

        return ResponseEntity.ok(ApiResponse.success("Exam attempt terminated successfully", null));
    }

    private void terminateAttemptInternal(ExamAttempt attempt) {
        Exam exam = attempt.getExam();
        List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository.findByAttemptIdOrderByQuestionOrderAsc(attempt.getId());
        List<Question> questions;
        if (!attemptQuestions.isEmpty()) {
            questions = new ArrayList<>();
            for (ExamAttemptQuestion eq : attemptQuestions) {
                questions.add(eq.getQuestion());
            }
        } else {
            questions = questionRepository.findByExamId(exam.getId());
        }
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attempt.getId());

        double correctMarksSum = 0;
        for (Question q : questions) {
            Optional<Answer> ansOpt = savedAnswers.stream()
                    .filter(ans -> ans.getQuestion().getId().equals(q.getId()))
                    .findFirst();

            if (ansOpt.isPresent() && q.getCorrectOption().equalsIgnoreCase(ansOpt.get().getSelectedOption())) {
                correctMarksSum += exam.getQuestionMarks(q.getDifficulty(), questions);
            }
        }

        int finalScore2 = (int) Math.round(correctMarksSum);
        Integer totMarksVal = exam.getTotalMarks() != null ? exam.getTotalMarks() : 100;
        finalScore2 = Math.min(finalScore2, totMarksVal);
        attempt.setScore(finalScore2);
        attempt.setEndTime(LocalDateTime.now());

        int percentScore2 = totMarksVal > 0 ? (int) Math.round((correctMarksSum / totMarksVal) * 100) : 0;
        percentScore2 = Math.min(percentScore2, 100);

        attempt.setAssignedLevel(null);
        attempt.setResultStatus(ResultStatus.TERMINATED);

        examAttemptRepository.save(attempt);

        // Archive all auto-saved answers into attempt_answers for permanent audit trail
        archiveAnswers(attempt);
    }

    @GetMapping("/attempts/{attemptId}/status")
    public ResponseEntity<ApiResponse<AttemptStatusDTO>> getAttemptStatus(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        long remaining = 0;
        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && attempt.getStartTime() != null) {
            LocalDateTime expectedEndTime = attempt.getStartTime().plusMinutes(attempt.getExam().getDurationMinutes());
            remaining = Duration.between(LocalDateTime.now(), expectedEndTime).getSeconds();
            if (remaining < 0) remaining = 0;
        } else if (attempt.getEndTime() != null) {
            remaining = Duration.between(LocalDateTime.now(), attempt.getEndTime()).getSeconds();
            if (remaining < 0) remaining = 0;
        }

        attempt.setLastSeen(LocalDateTime.now());
        attempt.setRemainingSeconds(remaining);
        examAttemptRepository.save(attempt);

        AttemptStatusDTO statusDTO = AttemptStatusDTO.builder()
                .status(attempt.getResultStatus().toString())
                .remainingSeconds(remaining)
                .lastSeen(attempt.getLastSeen())
                .build();

        return ResponseEntity.ok(ApiResponse.success("Attempt status retrieved", statusDTO));
    }

    @PostMapping("/attempts/{attemptId}/sync")
    public ResponseEntity<ApiResponse<AttemptStatusDTO>> syncAttemptAnswers(
            @PathVariable UUID attemptId,
            @RequestBody SyncRequestDTO request) {

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        int syncedCount = 0;
        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && request != null && request.getAnswers() != null) {
            for (AnswerSyncDTO dto : request.getAnswers()) {
                if (dto.getQuestionId() == null) continue;
                Question question = questionRepository.findById(dto.getQuestionId()).orElse(null);
                if (question == null) continue;

                String optionText = dto.getSelectedOption();
                if ((optionText == null || optionText.trim().isEmpty()) && dto.getOptionId() != null) {
                    int opId = dto.getOptionId();
                    if (opId == 1) optionText = "A";
                    else if (opId == 2) optionText = "B";
                    else if (opId == 3) optionText = "C";
                    else if (opId == 4) optionText = "D";
                }

                Optional<Answer> existing = answerRepository.findByAttemptIdAndQuestionId(attemptId, dto.getQuestionId());
                Answer answer;
                if (existing.isPresent()) {
                    answer = existing.get();
                    answer.setSelectedOption(optionText);
                } else {
                    answer = Answer.builder()
                            .attempt(attempt)
                            .question(question)
                            .selectedOption(optionText)
                            .build();
                }
                answerRepository.save(answer);
                syncedCount++;
            }
        }

        long remaining = 0;
        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && attempt.getStartTime() != null) {
            LocalDateTime expectedEndTime = attempt.getStartTime().plusMinutes(attempt.getExam().getDurationMinutes());
            remaining = Duration.between(LocalDateTime.now(), expectedEndTime).getSeconds();
            if (remaining < 0) remaining = 0;
        } else if (attempt.getEndTime() != null) {
            remaining = Duration.between(LocalDateTime.now(), attempt.getEndTime()).getSeconds();
            if (remaining < 0) remaining = 0;
        }

        attempt.setLastSeen(LocalDateTime.now());
        if (request != null && request.getRemainingSeconds() != null) {
            attempt.setRemainingSeconds(request.getRemainingSeconds());
        } else {
            attempt.setRemainingSeconds(remaining);
        }
        examAttemptRepository.save(attempt);

        AttemptStatusDTO statusDTO = AttemptStatusDTO.builder()
                .status(attempt.getResultStatus().toString())
                .remainingSeconds(remaining)
                .lastSeen(attempt.getLastSeen())
                .syncedCount(syncedCount)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Answers synchronized successfully", statusDTO));
    }

    @PostMapping("/attempts/{attemptId}/beacon")
    public ResponseEntity<ApiResponse<String>> handleBeacon(
            @PathVariable UUID attemptId,
            @RequestBody(required = false) String rawBody) {

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && rawBody != null && !rawBody.trim().isEmpty()) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                SyncRequestDTO request = mapper.readValue(rawBody, SyncRequestDTO.class);
                if (request != null && request.getAnswers() != null) {
                    for (AnswerSyncDTO dto : request.getAnswers()) {
                        if (dto.getQuestionId() == null) continue;
                        Question question = questionRepository.findById(dto.getQuestionId()).orElse(null);
                        if (question == null) continue;

                        Optional<Answer> existing = answerRepository.findByAttemptIdAndQuestionId(attemptId, dto.getQuestionId());
                        Answer answer;
                        if (existing.isPresent()) {
                            answer = existing.get();
                            answer.setSelectedOption(dto.getSelectedOption());
                        } else {
                            answer = Answer.builder()
                                    .attempt(attempt)
                                    .question(question)
                                    .selectedOption(dto.getSelectedOption())
                                    .build();
                        }
                        answerRepository.save(answer);
                    }
                }
            } catch (Exception e) {
                // Log and continue gracefully for beacon transmissions
            }
        }

        attempt.setLastSeen(LocalDateTime.now());
        examAttemptRepository.save(attempt);

        return ResponseEntity.ok(ApiResponse.success("Beacon recorded", "OK"));
    }

    private List<Question> fetchQuestionsForExam(Exam exam) {
        List<Question> questions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
        if (questions.isEmpty() && exam.getStack() != null && !exam.getStack().isBlank()) {
            questions = questionRepository.findByStackIgnoreCaseAndIsActiveTrue(exam.getStack());
        }
        if (questions.isEmpty()) {
            questions = questionRepository.findByIsActiveTrue();
        }
        if (questions.isEmpty()) {
            questions = seedStarterQuestions(exam);
        }
        return questions;
    }

    private List<Question> seedStarterQuestions(Exam exam) {
        String stackName = (exam.getStack() != null && !exam.getStack().isBlank()) ? exam.getStack() : "General";
        List<Question> seeded = new ArrayList<>();

        Question q1 = Question.builder()
                .exam(exam)
                .stack(stackName)
                .questionText("What is the primary characteristic of immutable data structures in " + stackName + "?")
                .optionA("Their state cannot be modified after creation")
                .optionB("They consume double the memory of mutable structures")
                .optionC("They can only store integer types")
                .optionD("They automatically garbage-collect references")
                .correctOption("A")
                .difficulty("EASY")
                .marks(1)
                .type("MCQ")
                .level("L1")
                .status("ACTIVE")
                .isActive(true)
                .build();

        Question q2 = Question.builder()
                .exam(exam)
                .stack(stackName)
                .questionText("Which of the following best describes exception handling best practices in " + stackName + "?")
                .optionA("Catch all exceptions silently with empty catch blocks")
                .optionB("Catch specific exceptions and handle or rethrow with contextual detail")
                .optionC("Avoid try-catch blocks entirely to maximize execution speed")
                .optionD("Rethrow RuntimeExceptions as checked exceptions")
                .correctOption("B")
                .difficulty("MEDIUM")
                .marks(2)
                .type("MCQ")
                .level("L3")
                .status("ACTIVE")
                .isActive(true)
                .build();

        Question q3 = Question.builder()
                .exam(exam)
                .stack(stackName)
                .questionText("What is the primary benefit of dependency injection in modular " + stackName + " applications?")
                .optionA("Decouples components and enhances unit testability")
                .optionB("Increases execution speed by pre-compiling bytecodes")
                .optionC("Eliminates the need for object-oriented programming")
                .optionD("Automatically encrypts network communications")
                .correctOption("A")
                .difficulty("MEDIUM")
                .marks(2)
                .type("MCQ")
                .level("L3")
                .status("ACTIVE")
                .isActive(true)
                .build();

        Question q4 = Question.builder()
                .exam(exam)
                .stack(stackName)
                .questionText("In " + stackName + ", what is the purpose of asynchronous non-blocking I/O?")
                .optionA("Allows threads to process other tasks while waiting for I/O operations")
                .optionB("Forces all network packets to send synchronously")
                .optionC("Disables multi-threading on the CPU core")
                .optionD("Requires hard disk encryption for disk writes")
                .correctOption("A")
                .difficulty("HARD")
                .marks(3)
                .type("MCQ")
                .level("L4")
                .status("ACTIVE")
                .isActive(true)
                .build();

        Question q5 = Question.builder()
                .exam(exam)
                .stack(stackName)
                .questionText("Which data structure provides constant O(1) average time complexity for key lookup operations?")
                .optionA("Hash Table / Map")
                .optionB("Singly Linked List")
                .optionC("Binary Search Tree")
                .optionD("Sorted Array")
                .correctOption("A")
                .difficulty("EASY")
                .marks(1)
                .type("MCQ")
                .level("L2")
                .status("ACTIVE")
                .isActive(true)
                .build();

        seeded.add(q1);
        seeded.add(q2);
        seeded.add(q3);
        seeded.add(q4);
        seeded.add(q5);

        return questionRepository.saveAll(seeded);
    }

    private List<Question> getAttemptQuestions(ExamAttempt attempt, List<Answer> savedAnswers) {
        Exam exam = attempt.getExam();
        List<Question> questions = fetchQuestionsForExam(exam);
        Integer perAttemptVal = exam.getPerAttempt();
        if (perAttemptVal == null) {
            perAttemptVal = exam.getQuestionsPerAttempt();
        }
        int perAttempt = (perAttemptVal != null) ? perAttemptVal : 0;

        if (perAttempt > 0 && questions.size() > perAttempt) {
            Random rand = new Random(attempt.getId().getMostSignificantBits() ^ attempt.getId().getLeastSignificantBits());
            List<Question> shuffled = new ArrayList<>(questions);
            Collections.shuffle(shuffled, rand);
            
            List<Question> subset = new ArrayList<>();
            Set<UUID> answeredIds = new HashSet<>();
            for (Answer ans : savedAnswers) {
                if (ans.getQuestion() != null) {
                    answeredIds.add(ans.getQuestion().getId());
                }
            }
            for (Question q : shuffled) {
                if (answeredIds.contains(q.getId())) {
                    subset.add(q);
                }
            }
            for (Question q : shuffled) {
                if (subset.size() >= perAttempt) {
                    break;
                }
                if (!subset.contains(q)) {
                    subset.add(q);
                }
            }
            return subset;
        }
        return questions;
    }

    private void archiveAnswers(ExamAttempt attempt) {
        try {
            // Delete existing attempt answers if any
            attemptAnswerRepository.deleteByAttemptId(attempt.getId());

            // Load candidate's saved answers from the Answer table
            List<Answer> savedAnswers = answerRepository.findByAttemptId(attempt.getId());
            List<AttemptAnswer> attemptAnswers = new ArrayList<>();
            for (Answer ans : savedAnswers) {
                attemptAnswers.add(AttemptAnswer.builder()
                        .attempt(attempt)
                        .question(ans.getQuestion())
                        .selectedOption(ans.getSelectedOption())
                        .build());
            }
            attemptAnswerRepository.saveAll(attemptAnswers);
        } catch (Exception e) {
            System.err.println("Error archiving answers: " + e.getMessage());
        }
    }
}
