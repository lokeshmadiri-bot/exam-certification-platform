package com.oryfolks.certify.service;

import com.oryfolks.certify.dto.AnswerSubmission;
import com.oryfolks.certify.dto.StartExamRequestDTO;
import com.oryfolks.certify.dto.StartExamResponseDTO;
import com.oryfolks.certify.dto.SubmitExamRequestDTO;
import com.oryfolks.certify.dto.SubmitExamResponseDTO;
import com.oryfolks.certify.entity.*;
import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.exception.BadRequestException;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class AttemptService {

        private final ExamAttemptRepository attemptRepository;

        private final UserRepository userRepository;

        private final ExamRepository examRepository;

        private final QuestionRepository questionRepository;

        private final AttemptAnswerRepository attemptAnswerRepository;

        private final IntegrityViolationRepository integrityViolationRepository;

        private final AnswerRepository answerRepository;

        private final ExamAttemptQuestionRepository examAttemptQuestionRepository;

        private final StorageService storageService;

        public StartExamResponseDTO startExam(
                        StartExamRequestDTO request,
                        String username) {

                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

                Exam exam = examRepository.findById(request.getExamId())
                                .orElseThrow(() -> new ResourceNotFoundException("Exam not found."));

                if (exam.getStatus() != ExamStatus.ACTIVE) {
                        throw new BadRequestException("Exam is not active.");
                }

                Optional<ExamAttempt> existingAttempt = attemptRepository
                                .findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(
                                                candidate.getId(),
                                                exam.getId());

                if (existingAttempt.isPresent()
                                && existingAttempt.get().getResultStatus() == ResultStatus.IN_PROGRESS) {

                        ExamAttempt attempt = existingAttempt.get();

                        return StartExamResponseDTO.builder()
                                        .attemptId(attempt.getId())
                                        .examId(exam.getId())
                                        .examTitle(exam.getTitle())
                                        .durationMinutes(exam.getDurationMinutes())
                                        .startTime(attempt.getStartTime())
                                        .build();
                }

                if (existingAttempt.isPresent()) {

                        ExamAttempt lastAttempt = existingAttempt.get();

                        LocalDateTime referenceDate = lastAttempt.getEndTime() != null
                                        ? lastAttempt.getEndTime()
                                        : lastAttempt.getCreatedAt();

                        LocalDateTime nextEligibleDate = referenceDate.plusDays(30);

                        System.out.println("==================================");
                        System.out.println("Attempt ID      : " + lastAttempt.getId());
                        System.out.println("Created At      : " + lastAttempt.getCreatedAt());
                        System.out.println("End Time        : " + lastAttempt.getEndTime());
                        System.out.println("Reference Date  : " + referenceDate);
                        System.out.println("Next Eligible   : " + nextEligibleDate);
                        System.out.println("Current Time    : " + LocalDateTime.now());
                        System.out.println("==================================");

                        if (false && LocalDateTime.now().isBefore(nextEligibleDate)) {

                                long remainingDays = java.time.Duration
                                                .between(LocalDateTime.now(), nextEligibleDate)
                                                .toDays();

                                throw new BadRequestException(
                                                "You have already attempted this exam. "
                                                                + "You can retake it after "
                                                                + nextEligibleDate.toLocalDate()
                                                                + " (" + remainingDays + " day(s) remaining).");
                        }
                }

                List<Question> activeQuestions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
                Integer requiredCount = exam.getPerAttempt();
                if (requiredCount == null) {
                        requiredCount = exam.getQuestionsPerAttempt();
                }
                int required = (requiredCount != null && requiredCount > 0) ? requiredCount : activeQuestions.size();

                if (activeQuestions.size() < required) {
                        throw new BadRequestException("Not enough active questions available for this exam. Required: "
                                        + required + ", Available: " + activeQuestions.size());
                }

                List<Question> poolCopy = new ArrayList<>(activeQuestions);
                Collections.shuffle(poolCopy);
                List<Question> selectedQuestions = poolCopy.subList(0, required);

                ExamAttempt attempt = ExamAttempt.builder()
                                .candidate(candidate)
                                .exam(exam)
                                .score(0)
                                .resultStatus(ResultStatus.IN_PROGRESS)
                                .startTime(LocalDateTime.now())
                                .tabSwitchCount(0)
                                .build();

                attempt = attemptRepository.save(attempt);

                List<ExamAttemptQuestion> attemptQuestions = new ArrayList<>();
                int order = 1;
                for (Question q : selectedQuestions) {
                        attemptQuestions.add(ExamAttemptQuestion.builder()
                                        .attempt(attempt)
                                        .question(q)
                                        .questionOrder(order++)
                                        .build());
                }
                examAttemptQuestionRepository.saveAll(attemptQuestions);

                return StartExamResponseDTO.builder()
                                .attemptId(attempt.getId())
                                .examId(exam.getId())
                                .examTitle(exam.getTitle())
                                .durationMinutes(exam.getDurationMinutes())
                                .startTime(attempt.getStartTime())
                                .build();
        }

        public void recordTabSwitch(UUID attemptId) {

                ExamAttempt attempt = attemptRepository.findById(attemptId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found."));

                attempt.setTabSwitchCount(attempt.getTabSwitchCount() + 1);

                attemptRepository.save(attempt);
        }

        public void recordViolation(
                        UUID attemptId,
                        String violationCode,
                        String metaDescription,
                        String timestampOffset,
                        MultipartFile snapshot) {

                // Find exam attempt
                ExamAttempt attempt = attemptRepository.findById(attemptId)
                                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found."));

                if (attempt.getResultStatus() != ResultStatus.IN_PROGRESS) {
                        return;
                }

                String snapshotUrl = null;

                if (snapshot != null && !snapshot.isEmpty()) {
                        snapshotUrl = storageService.uploadFile(snapshot, "integrity-violations");
                }

                // Create integrity violation
                IntegrityViolation violation = IntegrityViolation.builder()
                                .attempt(attempt)
                                .violationCode(violationCode)
                                .metaDescription(metaDescription)
                                .timestampOffset(timestampOffset)
                                .snapshotUrl(snapshotUrl)
                                .build();

                integrityViolationRepository.save(violation);

        }

        private void validateSelectedOption(String selectedOption) {

                if (selectedOption == null) {
                        throw new BadRequestException("Selected option is required.");
                }

                switch (selectedOption.toUpperCase()) {
                        case "A":
                        case "B":
                        case "C":
                        case "D":
                                return;

                        default:
                                throw new BadRequestException(
                                                "Invalid selected option. Allowed values are A, B, C or D.");
                }
        }

        public SubmitExamResponseDTO submitExam(
                        SubmitExamRequestDTO request,
                        String username) {

                // Find candidate
                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

                // Find exam attempt
                ExamAttempt attempt = attemptRepository.findById(request.getAttemptId())
                                .orElseThrow(() -> new ResourceNotFoundException("Exam attempt not found."));

                // Validate ownership
                if (!attempt.getCandidate().getId().equals(candidate.getId())) {
                        throw new BadRequestException(
                                        "You are not authorized to submit this exam.");
                }

                // Validate attempt status
                if (attempt.getResultStatus() != ResultStatus.IN_PROGRESS) {
                        return SubmitExamResponseDTO.builder()
                                        .attemptId(attempt.getId())
                                        .status(attempt.getResultStatus())
                                        .message("Exam was already submitted.")
                                        .submittedAt(attempt.getEndTime() != null ? attempt.getEndTime() : LocalDateTime.now())
                                        .build();
                }

                // Validate unanswered questions only for normal submission
                if (!Boolean.TRUE.equals(request.getForceSubmit())) {

                        List<ExamAttemptQuestion> assignedQuestions = examAttemptQuestionRepository
                                        .findByAttemptIdOrderByQuestionOrderAsc(attempt.getId());

                        int totalQuestions = !assignedQuestions.isEmpty()
                                        ? assignedQuestions.size()
                                        : questionRepository
                                                        .findByExamIdAndIsActiveTrue(attempt.getExam().getId())
                                                        .size();

                        int answeredQuestions = request.getAnswers().size();

                        if (answeredQuestions < totalQuestions) {

                                int unansweredQuestions = totalQuestions - answeredQuestions;

                                throw new BadRequestException(
                                                unansweredQuestions
                                                                + " question(s) are still unanswered. Please answer them or confirm submission.");
                        }
                }

                // Save submitted answers if present
                if (request.getAnswers() != null && !request.getAnswers().isEmpty()) {
                        Set<UUID> uniqueQuestionIds = new HashSet<>();
                        List<AttemptAnswer> newAnswers = new ArrayList<>();
                        for (AnswerSubmission answer : request.getAnswers()) {
                                if (answer.getQuestionId() != null && answer.getSelectedOption() != null) {
                                        if (uniqueQuestionIds.add(answer.getQuestionId())) {
                                                Question question = questionRepository.findById(answer.getQuestionId()).orElse(null);
                                                if (question != null) {
                                                        newAnswers.add(AttemptAnswer.builder()
                                                                        .attempt(attempt)
                                                                        .question(question)
                                                                        .selectedOption(answer.getSelectedOption())
                                                                        .build());
                                                }
                                        }
                                }
                        }
                        if (!newAnswers.isEmpty()) {
                                attemptAnswerRepository.deleteByAttemptId(attempt.getId());
                                attemptAnswerRepository.saveAll(newAnswers);
                        }
                }

                // Fetch all saved attempt answers for evaluation
                List<AttemptAnswer> savedAttemptAnswers = attemptAnswerRepository.findByAttemptId(attempt.getId());

                // Calculate score & level
                Exam exam = attempt.getExam();
                List<Question> questions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
                if (questions.isEmpty()) {
                        questions = questionRepository.findByExamId(exam.getId());
                }
                if (questions.isEmpty() && exam.getStack() != null && !exam.getStack().isBlank()) {
                        questions = questionRepository.findByStackIgnoreCaseAndIsActiveTrue(exam.getStack());
                        if (questions.isEmpty()) {
                                questions = questionRepository.findByStackIgnoreCase(exam.getStack());
                        }
                }
                if (questions.isEmpty()) {
                        questions = questionRepository.findByIsActiveTrue();
                }

                int totalMarks = 0;
                int earnedMarks = 0;

                for (Question q : questions) {
                        int qMarks = (q.getMarks() != null && q.getMarks() > 0) ? q.getMarks() : 1;
                        totalMarks += qMarks;

                        String correct = q.getCorrectOption() != null ? q.getCorrectOption().trim() : "";
                        Optional<AttemptAnswer> ansOpt = savedAttemptAnswers.stream()
                                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                                        .findFirst();

                        if (ansOpt.isPresent() && !correct.isEmpty() && ansOpt.get().getSelectedOption() != null) {
                                String userSelected = ansOpt.get().getSelectedOption().trim();
                                if (correct.equalsIgnoreCase(userSelected)) {
                                        earnedMarks += qMarks;
                                }
                        }
                }

                int finalScore = totalMarks > 0 ? (int) Math.round(((double) earnedMarks / totalMarks) * 100) : 0;
                attempt.setScore(finalScore);
                attempt.setEndTime(LocalDateTime.now());

                CompetencyLevel level = CompetencyLevel.L5;
                List<CompetencyBand> bands = exam.getCompetencyBands();
                if (bands != null) {
                        for (CompetencyBand band : bands) {
                                if (finalScore >= band.getMinScore() && finalScore <= band.getMaxScore()) {
                                        level = band.getLevelName();
                                        break;
                                }
                        }
                }
                attempt.setAssignedLevel(level);

                if (finalScore >= exam.getPassMark()) {
                        attempt.setResultStatus(ResultStatus.PASSED);
                } else {
                        attempt.setResultStatus(ResultStatus.FAILED);
                }

                attemptRepository.save(attempt);

                // Return response
                return SubmitExamResponseDTO.builder()
                                .attemptId(attempt.getId())
                                .status(attempt.getResultStatus())
                                .message("Exam submitted successfully.")
                                .submittedAt(attempt.getEndTime())
                                .build();
        }

        public Answer saveAnswer(
                        UUID attemptId,
                        AnswerSubmission submission) {

                ExamAttempt attempt = attemptRepository.findById(attemptId)
                                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found."));

                Question question = questionRepository.findById(submission.getQuestionId())
                                .orElseThrow(() -> new ResourceNotFoundException("Question not found."));

                if (question.getExam() == null) {
                        question.setExam(attempt.getExam());
                        questionRepository.save(question);
                } else if (!question.getExam().getId().equals(attempt.getExam().getId())
                                && (question.getStack() == null || attempt.getExam().getStack() == null || !question.getStack().equalsIgnoreCase(attempt.getExam().getStack()))) {
                        throw new BadRequestException(
                                        "Question does not belong to this exam.");
                }

                Optional<Answer> existing = answerRepository.findByAttemptIdAndQuestionId(
                                attemptId,
                                submission.getQuestionId());

                Answer answer;

                if (existing.isPresent()) {

                        answer = existing.get();
                        answer.setSelectedOption(submission.getSelectedOption());

                } else {

                        answer = Answer.builder()
                                        .attempt(attempt)
                                        .question(question)
                                        .selectedOption(submission.getSelectedOption())
                                        .build();

                }

                return answerRepository.save(answer);
        }

}