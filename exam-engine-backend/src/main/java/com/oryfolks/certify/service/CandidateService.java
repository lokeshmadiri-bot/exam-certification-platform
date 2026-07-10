package com.oryfolks.certify.service;

import com.oryfolks.certify.dto.CandidateDashboardResponseDTO;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.enums.ResultPublishStatus;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.exception.BadRequestException;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.repository.AttemptAnswerRepository;
import com.oryfolks.certify.repository.IntegrityViolationRepository;

import com.oryfolks.certify.dto.ResultResponseDTO;
import com.oryfolks.certify.dto.AttemptHistoryResponseDTO;
import com.oryfolks.certify.dto.AttemptDetailsResponseDTO;
import com.oryfolks.certify.dto.AttemptAnswerResponseDTO;
import com.oryfolks.certify.dto.IntegrityViolationResponseDTO;
import com.oryfolks.certify.entity.ExamAttempt;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CandidateService {

    private final UserRepository userRepository;

    private final ExamAttemptRepository attemptRepository;

    private final AttemptAnswerRepository attemptAnswerRepository;

    private final IntegrityViolationRepository integrityViolationRepository;

    @Transactional(readOnly = true)
    public CandidateDashboardResponseDTO getDashboard(String username) {

        // Find candidate
        User candidate = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        // Dashboard statistics
        long totalAttempts = attemptRepository.countByCandidateId(candidate.getId());

        long inProgressAttempts = attemptRepository.countByCandidateIdAndResultStatus(
                candidate.getId(),
                ResultStatus.IN_PROGRESS);

        long submittedAttempts = attemptRepository.countByCandidateIdAndResultStatus(
                candidate.getId(),
                ResultStatus.SUBMITTED);

        long publishedResults = attemptRepository.countByCandidateIdAndResultPublishStatus(
                candidate.getId(),
                ResultPublishStatus.PUBLISHED);

        // Recent Attempts
        List<AttemptHistoryResponseDTO> recentAttempts = attemptRepository
                .findByCandidateIdOrderByCreatedAtDesc(candidate.getId())
                .stream()
                .limit(5)
                .map(attempt -> AttemptHistoryResponseDTO.builder()
                        .attemptId(attempt.getId())
                        .examId(attempt.getExam().getId())
                        .examTitle(attempt.getExam().getTitle())
                        .stack(attempt.getExam().getStack())
                        .startedAt(attempt.getStartTime())
                        .submittedAt(attempt.getEndTime())
                        .resultStatus(attempt.getResultStatus())
                        .resultPublishStatus(attempt.getResultPublishStatus())
                        .build())
                .toList();

        return CandidateDashboardResponseDTO.builder()
                .fullName(candidate.getFullName())
                .title(candidate.getTitle())
                .totalAttempts(totalAttempts)
                .inProgressAttempts(inProgressAttempts)
                .submittedAttempts(submittedAttempts)
                .publishedResults(publishedResults)
                .recentAttempts(recentAttempts)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AttemptHistoryResponseDTO> getMyAttempts(String username) {

        User candidate = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());

        return attempts.stream()
                .map(attempt -> AttemptHistoryResponseDTO.builder()
                        .attemptId(attempt.getId())
                        .examId(attempt.getExam().getId())
                        .examTitle(attempt.getExam().getTitle())
                        .stack(attempt.getExam().getStack())
                        .startedAt(attempt.getStartTime())
                        .submittedAt(attempt.getEndTime())
                        .resultStatus(attempt.getResultStatus())
                        .resultPublishStatus(attempt.getResultPublishStatus())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public AttemptDetailsResponseDTO getAttemptDetails(
            UUID attemptId,
            String username) {

        User candidate = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        ExamAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found."));

        // Security check
        if (!attempt.getCandidate().getId().equals(candidate.getId())) {
            throw new BadRequestException(
                    "You are not authorized to view this attempt.");
        }

        List<AttemptAnswerResponseDTO> answers = attemptAnswerRepository.findByAttemptId(attemptId)
                .stream()
                .map(answer -> AttemptAnswerResponseDTO.builder()
                        .questionId(answer.getQuestion().getId())
                        .questionText(answer.getQuestion().getQuestionText())
                        .selectedOption(answer.getSelectedOption())
                        .build())
                .toList();

        List<IntegrityViolationResponseDTO> violations = integrityViolationRepository
                .findByAttemptIdOrderByCreatedAtAsc(attemptId)
                .stream()
                .map(v -> IntegrityViolationResponseDTO.builder()
                        .violationCode(v.getViolationCode())
                        .metaDescription(v.getMetaDescription())
                        .timestampOffset(v.getTimestampOffset())
                        .snapshotUrl(v.getSnapshotUrl())
                        .build())
                .toList();

        return AttemptDetailsResponseDTO.builder()
                .attemptId(attempt.getId())
                .examId(attempt.getExam().getId())
                .examTitle(attempt.getExam().getTitle())
                .stack(attempt.getExam().getStack())
                .startedAt(attempt.getStartTime())
                .submittedAt(attempt.getEndTime())
                .resultStatus(attempt.getResultStatus())
                .resultPublishStatus(attempt.getResultPublishStatus())
                .answers(answers)
                .integrityViolations(violations)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ResultResponseDTO> getMyResults(String username) {

        // Find logged-in candidate
        User candidate = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

        // Fetch candidate attempts ordered by latest submission
        List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByEndTimeDesc(candidate.getId());

        return attempts.stream()
                .map(attempt -> {

                    ResultResponseDTO.ResultResponseDTOBuilder builder = ResultResponseDTO.builder()
                            .attemptId(attempt.getId())
                            .examId(attempt.getExam().getId())
                            .examTitle(attempt.getExam().getTitle())
                            .stack(attempt.getExam().getStack())
                            .resultStatus(attempt.getResultStatus())
                            .resultPublishStatus(attempt.getResultPublishStatus());

                    // Only expose final evaluation after admin publishes
                    if (attempt.getResultPublishStatus() == ResultPublishStatus.PUBLISHED) {

                        builder
                                .competencyLevel(attempt.getCompetencyLevel())
                                .publishedAt(attempt.getPublishedAt());

                    } else {

                        builder
                                .competencyLevel(null)
                                .publishedAt(null);
                    }

                    return builder.build();

                })
                .toList();
    }

}
