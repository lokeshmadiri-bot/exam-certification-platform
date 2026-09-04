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

        private final CompetencyBandRepository competencyBandRepository;

        private final ApprovalRequestRepository approvalRepository;

        @org.springframework.beans.factory.annotation.Value("${app.retry-lock-duration-days:30}")
        private int retryLockDurationDays = 30;

        @org.springframework.beans.factory.annotation.Value("${app.override-lock-duration-days:7}")
        private int overrideLockDurationDays = 7;

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

                List<ExamAttempt> allCandidateAttempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());

                // 1. Check if candidate has ANY completed attempt for this exam/stack/title within the 30-day lock period
                Optional<ExamAttempt> completedAttemptOpt = allCandidateAttempts.stream()
                                .filter(a -> a.getResultStatus() != ResultStatus.IN_PROGRESS && isSameExam(a.getExam(), exam))
                                .findFirst();

                if (completedAttemptOpt.isPresent()) {
                        ExamAttempt lastCompleted = completedAttemptOpt.get();

                        LocalDateTime referenceDate = lastCompleted.getEndTime() != null
                                        ? lastCompleted.getEndTime()
                                        : lastCompleted.getCreatedAt();

                        int lockDays = retryLockDurationDays > 0 ? retryLockDurationDays : 30;
                        LocalDateTime nextEligibleDate = referenceDate != null ? referenceDate.plusDays(lockDays) : LocalDateTime.now();

                        boolean overrideActive = false;
                        if (Boolean.TRUE.equals(lastCompleted.getRetryOverrideApproved())) {
                                Optional<ExamAttempt> newerAttempt = allCandidateAttempts.stream()
                                                .filter(a -> a.getResultStatus() != ResultStatus.IN_PROGRESS 
                                                          && isSameExam(a.getExam(), lastCompleted.getExam())
                                                          && a.getCreatedAt().isAfter(lastCompleted.getCreatedAt()))
                                                .findFirst();
                                if (!newerAttempt.isPresent()) {
                                        overrideActive = true;
                                }
                        }

                        if (!overrideActive && candidate != null) {
                                String candidateIdStr = candidate.getId().toString();
                                String targetKey = exam != null ? candidateIdStr + ":" + exam.getId().toString() : candidateIdStr;

                                Optional<ApprovalRequest> approvalOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                                "CANDIDATE_UNLOCK", targetKey, "APPROVED"
                                );
                                if (!approvalOpt.isPresent()) {
                                        approvalOpt = approvalRepository.findFirstByTypeAndTargetIdAndStatusOrderByResolvedAtDesc(
                                                        "CANDIDATE_UNLOCK", candidateIdStr, "APPROVED"
                                        );
                                }
                                if (approvalOpt.isPresent()) {
                                        ApprovalRequest req = approvalOpt.get();
                                        LocalDateTime approvedAt = req.getResolvedAt();
                                        LocalDateTime refTime = lastCompleted.getEndTime() != null ? lastCompleted.getEndTime() : lastCompleted.getCreatedAt();
                                        if (approvedAt != null && refTime != null && !refTime.isAfter(approvedAt)) {
                                                int overrideDays = overrideLockDurationDays > 0 ? overrideLockDurationDays : 7;
                                                LocalDateTime expiresAt = approvedAt.plusDays(overrideDays);
                                                if (!LocalDateTime.now().isAfter(expiresAt)) {
                                                        overrideActive = true;
                                                }
                                        }
                                }
                        }

                        if (!overrideActive && LocalDateTime.now().isBefore(nextEligibleDate)) {
                                long remainingDays = java.time.Duration
                                                .between(LocalDateTime.now(), nextEligibleDate)
                                                .toDays();
                                long displayDays = Math.max(1, remainingDays);

                                throw new BadRequestException(
                                                "You have already attempted this exam (" + exam.getTitle() + "). "
                                                                + "You can retake it after "
                                                                + nextEligibleDate.toLocalDate()
                                                                + " (" + displayDays + " day(s) remaining).");
                        }
                }

                // 2. If unlocked and an in-progress attempt exists, resume it
                Optional<ExamAttempt> existingInProgress = allCandidateAttempts.stream()
                                .filter(a -> a.getResultStatus() == ResultStatus.IN_PROGRESS && a.getExam() != null && a.getExam().getId().equals(exam.getId()))
                                .findFirst();

                if (existingInProgress.isPresent()) {
                        ExamAttempt attempt = existingInProgress.get();

                        return StartExamResponseDTO.builder()
                                        .attemptId(attempt.getId())
                                        .examId(exam.getId())
                                        .examTitle(exam.getTitle())
                                        .durationMinutes(exam.getDurationMinutes())
                                        .startTime(attempt.getStartTime())
                                        .build();
                }

                List<Question> activeQuestions = fetchQuestionsForExam(exam);
                Integer requiredCount = exam.getPerAttempt();
                if (requiredCount == null) {
                        requiredCount = exam.getQuestionsPerAttempt();
                }
                int required = (requiredCount != null && requiredCount > 0) ? requiredCount : activeQuestions.size();

                if (activeQuestions.size() < required) {
                        required = activeQuestions.size();
                }

                List<Question> selectedQuestions = new ArrayList<>();
                if (required > 0 && !activeQuestions.isEmpty()) {
                        int easyTarget = 0;
                        int mediumTarget = 0;
                        int hardTarget = 0;

                        String diffMode = exam.getDifficultyMode() != null ? exam.getDifficultyMode().trim().toUpperCase() : "NONE";
                        if ("EASY".equalsIgnoreCase(diffMode)) {
                                easyTarget = required;
                        } else if ("MEDIUM".equalsIgnoreCase(diffMode)) {
                                mediumTarget = required;
                        } else if ("HARD".equalsIgnoreCase(diffMode)) {
                                hardTarget = required;
                        } else if ("MANUAL".equalsIgnoreCase(diffMode)) {
                                int bPct = exam.getBeginnerPct() != null ? exam.getBeginnerPct() : 40;
                                int iPct = exam.getIntermediatePct() != null ? exam.getIntermediatePct() : 40;
                                int aPct = exam.getAdvancedPct() != null ? exam.getAdvancedPct() : 20;
                                com.oryfolks.certify.util.DifficultyCalculator.DifficultyCounts counts = 
                                        com.oryfolks.certify.util.DifficultyCalculator.calculateCounts(required, bPct, iPct, aPct);
                                easyTarget = counts.getBeginner();
                                mediumTarget = counts.getIntermediate();
                                hardTarget = counts.getAdvanced();
                        } else {
                                // Default / Auto-distribute: 50% Easy, 30% Medium, 20% Hard
                                easyTarget = (int) Math.round(required * 0.50);
                                mediumTarget = (int) Math.round(required * 0.30);
                                hardTarget = required - easyTarget - mediumTarget;
                        }

                        List<Question> easyPool = new ArrayList<>();
                        List<Question> mediumPool = new ArrayList<>();
                        List<Question> hardPool = new ArrayList<>();

                        for (Question q : activeQuestions) {
                                String diff = q.getDifficulty() != null ? q.getDifficulty().trim().toUpperCase() : "EASY";
                                if ("HARD".equals(diff)) {
                                        hardPool.add(q);
                                } else if ("MEDIUM".equals(diff)) {
                                        mediumPool.add(q);
                                } else {
                                        easyPool.add(q);
                                }
                        }

                        // Validate that each pool has sufficient questions
                        if (easyPool.size() < easyTarget) {
                                throw new BadRequestException(String.format(
                                        "Unable to create exam.\nRequested:\nBeginner: %d\nAvailable:\nBeginner: %d\nPlease add %d more Beginner questions or adjust the difficulty distribution.",
                                        easyTarget, easyPool.size(), easyTarget - easyPool.size()
                                ));
                        }
                        if (mediumPool.size() < mediumTarget) {
                                throw new BadRequestException(String.format(
                                        "Unable to create exam.\nRequested:\nIntermediate: %d\nAvailable:\nIntermediate: %d\nPlease add %d more Intermediate questions or adjust the difficulty distribution.",
                                        mediumTarget, mediumPool.size(), mediumTarget - mediumPool.size()
                                ));
                        }
                        if (hardPool.size() < hardTarget) {
                                throw new BadRequestException(String.format(
                                        "Unable to create exam.\nRequested:\nAdvanced: %d\nAvailable:\nAdvanced: %d\nPlease add %d more Advanced questions or adjust the difficulty distribution.",
                                        hardTarget, hardPool.size(), hardTarget - hardPool.size()
                                ));
                        }

                        Collections.shuffle(easyPool);
                        Collections.shuffle(mediumPool);
                        Collections.shuffle(hardPool);

                        List<Question> selected = new ArrayList<>();
                        selected.addAll(easyPool.subList(0, easyTarget));
                        selected.addAll(mediumPool.subList(0, mediumTarget));
                        selected.addAll(hardPool.subList(0, hardTarget));

                        selectedQuestions = selected;
                }

                int bCount = 0;
                int iCount = 0;
                int aCount = 0;
                for (Question q : selectedQuestions) {
                        String diff = q.getDifficulty() != null ? q.getDifficulty().trim().toUpperCase() : "EASY";
                        if ("HARD".equals(diff)) {
                                aCount++;
                        } else if ("MEDIUM".equals(diff)) {
                                iCount++;
                        } else {
                                bCount++;
                        }
                }

                long totalDurationSeconds = (long) (exam.getDurationMinutes() != null ? exam.getDurationMinutes() : 45) * 60;
                int totalQuestions = selectedQuestions.size();
                long beginnerTimeSeconds = 0;
                long intermediateTimeSeconds = 0;
                long advancedTimeSeconds = 0;

                if (totalQuestions > 0) {
                        beginnerTimeSeconds = totalDurationSeconds * bCount / totalQuestions;
                        intermediateTimeSeconds = totalDurationSeconds * iCount / totalQuestions;
                        advancedTimeSeconds = totalDurationSeconds - beginnerTimeSeconds - intermediateTimeSeconds;
                }

                long totalSeconds = beginnerTimeSeconds + intermediateTimeSeconds + advancedTimeSeconds;

                ExamAttempt attempt = ExamAttempt.builder()
                                .candidate(candidate)
                                .exam(exam)
                                .score(0)
                                .resultStatus(ResultStatus.IN_PROGRESS)
                                .startTime(LocalDateTime.now())
                                .tabSwitchCount(0)
                                .beginnerTimeRemaining(beginnerTimeSeconds)
                                .intermediateTimeRemaining(intermediateTimeSeconds)
                                .advancedTimeRemaining(advancedTimeSeconds)
                                .remainingSeconds(totalSeconds)
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
                                .durationMinutes((int) (totalSeconds / 60))
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

        public static CompetencyLevel calculateLevel(int percentScore, int passMark, List<CompetencyBand> bands) {
                if (percentScore < passMark) {
                        return null;
                }
                if (bands == null || bands.isEmpty()) {
                        return CompetencyLevel.L3;
                }
                CompetencyBand l5 = bands.stream().filter(b -> b.getLevelName() == CompetencyLevel.L5).findFirst().orElse(null);
                CompetencyBand l4 = bands.stream().filter(b -> b.getLevelName() == CompetencyLevel.L4).findFirst().orElse(null);
                CompetencyBand l3 = bands.stream().filter(b -> b.getLevelName() == CompetencyLevel.L3).findFirst().orElse(null);
                CompetencyBand l2 = bands.stream().filter(b -> b.getLevelName() == CompetencyLevel.L2).findFirst().orElse(null);
                CompetencyBand l1 = bands.stream().filter(b -> b.getLevelName() == CompetencyLevel.L1).findFirst().orElse(null);

                int maxL5 = (l5 != null) ? l5.getMaxScore() : 19;
                int maxL4 = (l4 != null) ? l4.getMaxScore() : 39;
                int maxL3 = (l3 != null) ? l3.getMaxScore() : 59;
                int maxL2 = (l2 != null) ? l2.getMaxScore() : 79;

                int range = 100 - passMark;
                int upperL5 = passMark + (int) Math.round((double) maxL5 / 100.0 * range);
                int upperL4 = passMark + (int) Math.round((double) maxL4 / 100.0 * range);
                int upperL3 = passMark + (int) Math.round((double) maxL3 / 100.0 * range);
                int upperL2 = passMark + (int) Math.round((double) maxL2 / 100.0 * range);

                upperL5 = Math.max(passMark, Math.min(upperL5, 100));
                upperL4 = Math.max(upperL5, Math.min(upperL4, 100));
                upperL3 = Math.max(upperL4, Math.min(upperL3, 100));
                upperL2 = Math.max(upperL3, Math.min(upperL2, 100));

                if (percentScore <= upperL5) return CompetencyLevel.L5;
                if (percentScore <= upperL4) return CompetencyLevel.L4;
                if (percentScore <= upperL3) return CompetencyLevel.L3;
                if (percentScore <= upperL2) return CompetencyLevel.L2;
                return CompetencyLevel.L1;
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
                List<ExamAttemptQuestion> attemptQuestions = examAttemptQuestionRepository
                                .findByAttemptIdOrderByQuestionOrderAsc(attempt.getId());
                List<Question> questions = new ArrayList<>();
                if (attemptQuestions != null && !attemptQuestions.isEmpty()) {
                        for (ExamAttemptQuestion eq : attemptQuestions) {
                                questions.add(eq.getQuestion());
                        }
                } else {
                        questions = questionRepository.findByExamIdAndIsActiveTrue(exam.getId());
                        if (questions.isEmpty()) {
                                questions = questionRepository.findByExamId(exam.getId());
                        }
                        if (questions.isEmpty() && exam.getStack() != null && !exam.getStack().isBlank()) {
                                questions = questionRepository.findByStackIgnoreCaseAndIsActiveTrue(exam.getStack());
                                if (questions.isEmpty()) {
                                        questions = questionRepository.findByStackIgnoreCase(exam.getStack());
                                }
                        }
                } // end else (no attempt questions)

                int totalQuestions = 0;
                int correctCount = 0;

                for (Question q : questions) {
                        totalQuestions++; // 1 question = 1 point

                        String correct = q.getCorrectOption() != null ? q.getCorrectOption().trim() : "";
                        String userSelected = null;

                        Optional<AttemptAnswer> ansOpt = savedAttemptAnswers.stream()
                                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                                        .findFirst();

                        if (ansOpt.isPresent() && ansOpt.get().getSelectedOption() != null) {
                                userSelected = ansOpt.get().getSelectedOption().trim();
                        } else {
                                Optional<Answer> aOpt = answerRepository.findByAttemptIdAndQuestionId(attempt.getId(), q.getId());
                                if (aOpt.isPresent() && aOpt.get().getSelectedOption() != null) {
                                        userSelected = aOpt.get().getSelectedOption().trim();
                                }
                        }

                        if (userSelected != null && !correct.isEmpty() && correct.equalsIgnoreCase(userSelected)) {
                                correctCount++;
                        }
                }

                // Sum correct question marks dynamically based on difficulty weighting
                double correctMarksSum = 0;
                for (Question q : questions) {
                        String correct = q.getCorrectOption() != null ? q.getCorrectOption().trim() : "";
                        String userSelected = null;

                        Optional<AttemptAnswer> ansOpt = savedAttemptAnswers.stream()
                                        .filter(ans -> ans.getQuestion() != null && ans.getQuestion().getId().equals(q.getId()))
                                        .findFirst();

                        if (ansOpt.isPresent() && ansOpt.get().getSelectedOption() != null) {
                                userSelected = ansOpt.get().getSelectedOption().trim();
                        } else {
                                Optional<Answer> aOpt = answerRepository.findByAttemptIdAndQuestionId(attempt.getId(), q.getId());
                                if (aOpt.isPresent() && aOpt.get().getSelectedOption() != null) {
                                        userSelected = aOpt.get().getSelectedOption().trim();
                                }
                        }

                        if (userSelected != null && !correct.isEmpty() && correct.equalsIgnoreCase(userSelected)) {
                                correctMarksSum += exam.getQuestionMarks(q.getDifficulty(), questions);
                        }
                }

                int finalScore = (int) Math.round(correctMarksSum);
                Integer totMarksVal = exam.getTotalMarks() != null ? exam.getTotalMarks() : 100;
                finalScore = Math.min(finalScore, totMarksVal);
                attempt.setScore(finalScore);
                LocalDateTime now = LocalDateTime.now();
                attempt.setEndTime(now);
                attempt.setSubmittedAt(now);

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
                        attempt.setAssignedLevel(calculateLevel(percentScore, exam.getPassMark(), bands));
                } else {
                        attempt.setResultStatus(ResultStatus.FAILED);
                        attempt.setAssignedLevel(null);
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

        public static boolean isSameExam(Exam e1, Exam e2) {
                if (e1 == null || e2 == null) return false;
                if (e1.getId() != null && e2.getId() != null && e1.getId().equals(e2.getId())) return true;
                
                String t1 = e1.getTitle() != null ? e1.getTitle().toLowerCase().trim() : "";
                String t2 = e2.getTitle() != null ? e2.getTitle().toLowerCase().trim() : "";
                if (!t1.isEmpty() && !t2.isEmpty()) {
                        if (t1.equals(t2) || t1.contains(t2) || t2.contains(t1)) return true;
                        if ((t1.contains("react") || t1.contains("frontend")) && (t2.contains("react") || t2.contains("frontend"))) return true;
                        if ((t1.contains("java") || t1.contains("full stack") || t1.contains("fullstack")) && (t2.contains("java") || t2.contains("full stack") || t2.contains("fullstack"))) return true;
                        if ((t1.contains("python") || t1.contains("backend")) && (t2.contains("python") || t2.contains("backend"))) return true;
                }

                String s1 = e1.getStack() != null ? e1.getStack().toLowerCase().trim() : "";
                String s2 = e2.getStack() != null ? e2.getStack().toLowerCase().trim() : "";
                if (!s1.isEmpty() && !s2.isEmpty()) {
                        if (s1.equals(s2) || s1.contains(s2) || s2.contains(s1)) return true;
                        if ((s1.contains("react") || s1.contains("frontend")) && (s2.contains("react") || s2.contains("frontend"))) return true;
                        if ((s1.contains("java") || s1.contains("full stack") || s1.contains("fullstack")) && (s2.contains("java") || s2.contains("full stack") || s2.contains("fullstack"))) return true;
                        if ((s1.contains("python") || s1.contains("backend")) && (s2.contains("python") || s2.contains("backend"))) return true;
                }

                return false;
        }
}