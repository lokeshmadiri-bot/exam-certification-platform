package com.oryfolks.certify.service;

import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.repository.AttemptAnswerRepository;
import com.oryfolks.certify.repository.AnswerRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.oryfolks.certify.dto.StartExamRequestDTO;
import com.oryfolks.certify.dto.StartExamResponseDTO;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.exception.BadRequestException;

import com.oryfolks.certify.dto.SubmitExamRequestDTO;
import com.oryfolks.certify.dto.SubmitExamResponseDTO;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import com.oryfolks.certify.dto.AnswerSubmission;

import com.oryfolks.certify.entity.AttemptAnswer;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.entity.Answer;

import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.multipart.MultipartFile;

import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.entity.IntegrityViolation;

import com.oryfolks.certify.repository.IntegrityViolationRepository;
import com.oryfolks.certify.service.StorageService;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

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

        private final StorageService storageService;

        public StartExamResponseDTO startExam(
                        StartExamRequestDTO request,
                        String username) {

                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + username));

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

                        if (LocalDateTime.now().isBefore(nextEligibleDate)) {

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

                ExamAttempt attempt = ExamAttempt.builder()
                                .candidate(candidate)
                                .exam(exam)
                                .score(0)
                                .resultStatus(ResultStatus.IN_PROGRESS)
                                .startTime(LocalDateTime.now())
                                .tabSwitchCount(0)
                                .build();

                attempt = attemptRepository.save(attempt);

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
                        throw new BadRequestException(
                                        "This exam has already been submitted or completed.");
                }

                // Validate unanswered questions only for normal submission
                if (!Boolean.TRUE.equals(request.getForceSubmit())) {

                        int totalQuestions = questionRepository
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

                // Convert submitted answers into AttemptAnswer entities
                List<AttemptAnswer> attemptAnswers = new ArrayList<>();

                Set<UUID> uniqueQuestionIds = new HashSet<>();

                for (AnswerSubmission answer : request.getAnswers()) {

                        validateSelectedOption(answer.getSelectedOption());

                        if (!uniqueQuestionIds.add(answer.getQuestionId())) {
                                throw new BadRequestException(
                                                "Duplicate answers detected for question: " + answer.getQuestionId());
                        }

                        Question question = questionRepository.findById(answer.getQuestionId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Question not found: " + answer.getQuestionId()));

                        if (!question.getExam().getId().equals(attempt.getExam().getId())) {
                                throw new BadRequestException(
                                                "Question does not belong to this exam.");
                        }

                        AttemptAnswer attemptAnswer = AttemptAnswer.builder()
                                        .attempt(attempt)
                                        .question(question)
                                        .selectedOption(answer.getSelectedOption())
                                        .build();

                        attemptAnswers.add(attemptAnswer);
                }

                // Remove previously stored answers for this attempt (if any)
                attemptAnswerRepository.deleteByAttemptId(attempt.getId());

                // Save latest submitted answers
                attemptAnswerRepository.saveAll(attemptAnswers);

                // Update exam attempt
                attempt.setResultStatus(ResultStatus.SUBMITTED);
                attempt.setEndTime(LocalDateTime.now());

                attemptRepository.save(attempt);

                // Return response
                return SubmitExamResponseDTO.builder()
                                .attemptId(attempt.getId())
                                .status(ResultStatus.SUBMITTED)
                                .message("Exam submitted successfully. Your results will be published after admin review.")
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

                if (!question.getExam().getId().equals(attempt.getExam().getId())) {
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