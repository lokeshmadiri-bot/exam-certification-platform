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
    private UserRepository userRepository;

    @Autowired
    private SectionRepository sectionRepository;

    @Autowired
    private AnswerRepository answerRepository;


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
        List<Question> questions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attemptId);

        Map<String, String> answersMap = new HashMap<>();
        for (Answer ans : savedAnswers) {
            answersMap.put(ans.getQuestion().getId().toString(), ans.getSelectedOption());
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
        if (attempt.getEndTime() != null) {
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
            return ResponseEntity.badRequest().body(ApiResponse.error("Exam is already submitted or terminated"));
        }

        Exam exam = attempt.getExam();
        List<Question> questions = questionRepository.findByExamId(exam.getId());
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attemptId);

        int totalMarks = 0;
        int earnedMarks = 0;

        for (Question q : questions) {
            totalMarks += q.getMarks();
            Optional<Answer> ansOpt = savedAnswers.stream()
                    .filter(ans -> ans.getQuestion().getId().equals(q.getId()))
                    .findFirst();

            if (ansOpt.isPresent() && q.getCorrectOption().equalsIgnoreCase(ansOpt.get().getSelectedOption())) {
                earnedMarks += q.getMarks();
            }
        }

        int finalScore = totalMarks > 0 ? (int) Math.round(((double) earnedMarks / totalMarks) * 100) : 0;
        attempt.setScore(finalScore);
        attempt.setEndTime(LocalDateTime.now());

        CompetencyLevel level = CompetencyLevel.L5;
        List<CompetencyBand> bands = exam.getCompetencyBands();
        for (CompetencyBand band : bands) {
            if (finalScore >= band.getMinScore() && finalScore <= band.getMaxScore()) {
                level = band.getLevelName();
                break;
            }
        }
        attempt.setAssignedLevel(level);

        if (finalScore >= exam.getPassMark()) {
            attempt.setResultStatus(ResultStatus.PASSED);
        } else {
            attempt.setResultStatus(ResultStatus.FAILED);
        }

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
            return ResponseEntity.ok(ApiResponse.success("Attempt is already completed or terminated",
                    new ViolationResponseDTO((int) count, true)));
        }

        long currentCount = examViolationRepository.countByAttemptId(attemptId);
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
                .description("Violation of type " + request.getType() + " detected.")
                .createdAt(violationTime)
                .build();

        examViolationRepository.save(violation);

        boolean terminate = strikeNumber >= 3;
        if (terminate) {
            terminateAttemptInternal(attempt);
        }

        return ResponseEntity.ok(ApiResponse.success("Violation recorded",
                new ViolationResponseDTO(strikeNumber, terminate)));
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
        List<Question> questions = questionRepository.findByExamId(exam.getId());
        List<Answer> savedAnswers = answerRepository.findByAttemptId(attempt.getId());

        int totalMarks = 0;
        int earnedMarks = 0;

        for (Question q : questions) {
            totalMarks += q.getMarks();
            Optional<Answer> ansOpt = savedAnswers.stream()
                    .filter(ans -> ans.getQuestion().getId().equals(q.getId()))
                    .findFirst();

            if (ansOpt.isPresent() && q.getCorrectOption().equalsIgnoreCase(ansOpt.get().getSelectedOption())) {
                earnedMarks += q.getMarks();
            }
        }

        int finalScore = totalMarks > 0 ? (int) Math.round(((double) earnedMarks / totalMarks) * 100) : 0;
        attempt.setScore(finalScore);
        attempt.setEndTime(LocalDateTime.now());

        CompetencyLevel level = CompetencyLevel.L5;
        List<CompetencyBand> bands = exam.getCompetencyBands();
        for (CompetencyBand band : bands) {
            if (finalScore >= band.getMinScore() && finalScore <= band.getMaxScore()) {
                level = band.getLevelName();
                break;
            }
        }
        attempt.setAssignedLevel(level);
        attempt.setResultStatus(ResultStatus.TERMINATED);

        examAttemptRepository.save(attempt);
    }

    @GetMapping("/attempts/{attemptId}/status")
    public ResponseEntity<ApiResponse<AttemptStatusDTO>> getAttemptStatus(@PathVariable UUID attemptId) {
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        long remaining = 0;
        if (attempt.getEndTime() != null) {
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
        if (attempt.getEndTime() != null) {
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
}
