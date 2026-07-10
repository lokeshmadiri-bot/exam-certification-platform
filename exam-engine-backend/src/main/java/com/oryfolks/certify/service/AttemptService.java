package com.oryfolks.certify.service;

import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.repository.AttemptAnswerRepository;

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

import org.springframework.transaction.annotation.Transactional;


import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

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

        Optional<ExamAttempt> existingAttempt = attemptRepository.findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(
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

        ExamAttempt attempt = ExamAttempt.builder()
                .candidate(candidate)
                .exam(exam)
                .score(0)
                .assignedLevel(null)
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

    @Transactional
public void recordTabSwitch(UUID attemptId) {

    ExamAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() ->
                    new ResourceNotFoundException("Exam attempt not found."));

    attempt.setTabSwitchCount(attempt.getTabSwitchCount() + 1);

    attemptRepository.save(attempt);
}

    @Transactional
public void recordViolation(
        UUID attemptId,
        String violationCode,
        String metaDescription,
        String timestampOffset,
        MultipartFile snapshot) {

    // Find exam attempt
    ExamAttempt attempt = attemptRepository.findById(attemptId)
            .orElseThrow(() ->
                    new ResourceNotFoundException("Exam attempt not found."));

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


    @Transactional
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

            if (!uniqueQuestionIds.add(answer.getQuestionId())) {
                throw new BadRequestException(
                        "Duplicate answers detected for question: " + answer.getQuestionId());
            }

            Question question = questionRepository.findById(answer.getQuestionId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Question not found: " + answer.getQuestionId()));

            AttemptAnswer attemptAnswer = AttemptAnswer.builder()
                    .attempt(attempt)
                    .question(question)
                    .selectedOption(answer.getSelectedOption())
                    .build();

            attemptAnswers.add(attemptAnswer);
        }

        // Save all answers
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

}