package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.dto.AnswerSubmission;
import com.oryfolks.certify.dto.ViolationRequestDTO;
import com.oryfolks.certify.dto.ViolationResponseDTO;
import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.*;
import com.oryfolks.certify.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

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
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Question>> addQuestion(@PathVariable UUID id, @RequestBody Question question) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        question.setExam(exam);
        Question savedQuestion = questionRepository.save(question);
        return ResponseEntity.ok(ApiResponse.success("Question added successfully", savedQuestion));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Exam>> updateExamStatus(@PathVariable UUID id, @RequestParam String status) {
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        exam.setStatus(ExamStatus.valueOf(status.toUpperCase()));
        Exam saved = examRepository.save(exam);
        return ResponseEntity.ok(ApiResponse.success("Exam status updated", saved));
    }

    @PostMapping("/{examId}/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startExamAttempt(
            @PathVariable UUID examId,
            Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new RuntimeException("Exam not found"));

        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = startTime.plusMinutes(exam.getDurationMinutes());

        ExamAttempt attempt = ExamAttempt.builder()
                .candidate(user)
                .exam(exam)
                .resultStatus(ResultStatus.IN_PROGRESS)
                .startTime(startTime)
                .endTime(endTime)
                .tabSwitchCount(0)
                .build();

        ExamAttempt savedAttempt = examAttemptRepository.save(attempt);

        Map<String, Object> response = new HashMap<>();
        response.put("attemptId", savedAttempt.getId());
        response.put("startTime", startTime.toString());
        response.put("endTime", endTime.toString());
        response.put("remainingSeconds", Duration.between(LocalDateTime.now(), endTime).getSeconds());

        return ResponseEntity.ok(ApiResponse.success("Exam attempt started", response));
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
}
