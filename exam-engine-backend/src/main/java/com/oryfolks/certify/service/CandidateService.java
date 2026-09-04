package com.oryfolks.certify.service;

import com.oryfolks.certify.dto.CandidateDashboardResponseDTO;
import com.oryfolks.certify.dto.CandidateProfileResponseDTO;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.enums.ResultPublishStatus;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.exception.BadRequestException;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.UserRepository;
import com.oryfolks.certify.repository.AttemptAnswerRepository;
import com.oryfolks.certify.repository.IntegrityViolationRepository;
import com.oryfolks.certify.repository.CompetencyBandRepository;
import com.oryfolks.certify.repository.ApprovalRequestRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.entity.ApprovalRequest;
import com.oryfolks.certify.entity.Exam;
import org.springframework.beans.factory.annotation.Value;

import com.oryfolks.certify.dto.ResultResponseDTO;
import com.oryfolks.certify.dto.AttemptHistoryResponseDTO;
import com.oryfolks.certify.dto.AttemptDetailsResponseDTO;
import com.oryfolks.certify.dto.AttemptAnswerResponseDTO;
import com.oryfolks.certify.dto.IntegrityViolationResponseDTO;
import com.oryfolks.certify.entity.ExamAttempt;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Date;
import java.util.Optional;

import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.UUID;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CandidateService {

        private final UserRepository userRepository;

        private final ExamAttemptRepository attemptRepository;

        private final AttemptAnswerRepository attemptAnswerRepository;

        private final IntegrityViolationRepository integrityViolationRepository;

        private final CompetencyBandRepository competencyBandRepository;

        private final ApprovalRequestRepository approvalRepository;
        private final ExamRepository examRepository;

        @Value("${app.retry-lock-duration-days:30}")
        private int retryLockDurationDays;

        @Value("${app.override-lock-duration-days:7}")
        private int overrideLockDurationDays;

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
                List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());
                Map<String, ApprovalRequest> approvalMap = loadApprovalMap();
                Map<UUID, List<CompetencyBand>> bandsMap = loadBandsMap();

                List<AttemptHistoryResponseDTO> recentAttempts = attempts
                                .stream()
                                .limit(5)
                                .map(a -> mapAttemptHistory(a, attempts, approvalMap, bandsMap))
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

        public CandidateProfileResponseDTO getProfile(String username) {

                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Candidate not found: " + username));

                return CandidateProfileResponseDTO.builder()
                                .id(candidate.getId())
                                .username(candidate.getUsername())
                                .fullName(candidate.getFullName())
                                .build();
        }

        public List<AttemptHistoryResponseDTO> getMyAttempts(String username) {

                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

                List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId());
                Map<String, ApprovalRequest> approvalMap = loadApprovalMap();
                Map<UUID, List<CompetencyBand>> bandsMap = loadBandsMap();

                return attempts.stream()
                                .map(a -> mapAttemptHistory(a, attempts, approvalMap, bandsMap))
                                .toList();
        }

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

                CompetencyBand band = null;
                if (attempt.getExam() != null && attempt.getAssignedLevel() != null) {
                    List<CompetencyBand> bands = competencyBandRepository.findByExamId(attempt.getExam().getId());
                    band = bands.stream()
                            .filter(cb -> cb.getLevelName() == attempt.getAssignedLevel())
                            .findFirst().orElse(null);
                }
                boolean isDecided = attempt.getAdminDecision() != null &&
                        (attempt.getAdminDecision().equals("CONFIRMED") || attempt.getAdminDecision().equals("REJECTED"));

                Integer finalScore = null;
                ResultStatus status = null;
                String levelStr = null;
                String levelTitle = null;
                List<AttemptAnswerResponseDTO> answersList = null;

                if (isDecided) {
                        if (attempt.getAdminDecision().equals("CONFIRMED")) {
                                finalScore = attempt.getScore();
                                status = attempt.getResultStatus();
                                if (status == ResultStatus.PASSED) {
                                        levelStr = attempt.getAssignedLevel() != null ? attempt.getAssignedLevel().name() : "—";
                                        levelTitle = band != null ? band.getTitle() : getDefaultLevelTitle(attempt.getAssignedLevel());
                                } else {
                                        levelStr = "—";
                                        levelTitle = "Failed";
                                }
                                answersList = answers;
                        } else if (attempt.getAdminDecision().equals("REJECTED")) {
                                status = ResultStatus.FAILED;
                                levelStr = "—";
                                levelTitle = "Rejected";
                        }
                } else {
                        levelStr = "—";
                        levelTitle = "Pending Review";
                }

                return AttemptDetailsResponseDTO.builder()
                                .attemptId(attempt.getId())
                                .examId(attempt.getExam().getId())
                                .examTitle(attempt.getExam().getTitle())
                                .stack(attempt.getExam().getStack())
                                .startedAt(attempt.getStartTime())
                                .submittedAt(attempt.getEndTime())
                                .score(finalScore)
                                .totalMarks(attempt.getExam() != null ? attempt.getExam().getTotalMarks() : 100)
                                .resultStatus(status)
                                .resultPublishStatus(attempt.getResultPublishStatus() != null ? attempt.getResultPublishStatus() : ResultPublishStatus.PENDING)
                                .assignedLevel(levelStr)
                                .assignedLevelTitle(levelTitle)
                                .answers(answersList)
                                .integrityViolations(violations)
                                .adminDecision(attempt.getAdminDecision())
                                .rejectionReason(attempt.getRejectionReason())
                                .build();
        }

        public List<ResultResponseDTO> getMyResults(String username) {
                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));

                List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByEndTimeDesc(candidate.getId());

                return attempts.stream()
                                .filter(a -> a.getResultStatus() != ResultStatus.IN_PROGRESS)
                                .map(attempt -> {
                                        boolean isDecided = attempt.getAdminDecision() != null &&
                                                (attempt.getAdminDecision().equals("CONFIRMED") || attempt.getAdminDecision().equals("REJECTED"));
                                        
                                        ResultStatus finalStatus = null;
                                        if (isDecided) {
                                                if (attempt.getAdminDecision().equals("REJECTED")) {
                                                        finalStatus = ResultStatus.FAILED;
                                                } else {
                                                        finalStatus = attempt.getResultStatus();
                                                }
                                        }

                                        ResultResponseDTO.ResultResponseDTOBuilder builder = ResultResponseDTO.builder()
                                                         .attemptId(attempt.getId())
                                                         .examId(attempt.getExam().getId())
                                                         .examTitle(attempt.getExam().getTitle())
                                                         .stack(attempt.getExam().getStack())
                                                         .resultStatus(finalStatus)
                                                         .resultPublishStatus(attempt.getResultPublishStatus())
                                                         .adminDecision(attempt.getAdminDecision());

                                        if (isDecided && attempt.getAdminDecision().equals("CONFIRMED") && attempt.getResultPublishStatus() == ResultPublishStatus.PUBLISHED) {
                                                builder.competencyLevel(attempt.getCompetencyLevel())
                                                       .publishedAt(attempt.getPublishedAt());
                                        } else if (isDecided && attempt.getAdminDecision().equals("REJECTED")) {
                                                builder.rejectionReason(attempt.getRejectionReason())
                                                       .publishedAt(attempt.getPublishedAt());
                                        } else {
                                                builder.competencyLevel(null).publishedAt(null);
                                        }

                                        return builder.build();
                                 })
                                 .toList();
        }

        private Map<String, ApprovalRequest> loadApprovalMap() {
                List<ApprovalRequest> candidateApprovals = approvalRepository != null 
                        ? approvalRepository.findAll().stream().filter(r -> r != null && "CANDIDATE_UNLOCK".equals(r.getType()) && "APPROVED".equals(r.getStatus())).toList() 
                        : List.of();
                Map<String, ApprovalRequest> map = new HashMap<>();
                for (ApprovalRequest req : candidateApprovals) {
                        if (req != null && req.getTargetId() != null && !map.containsKey(req.getTargetId())) {
                                map.put(req.getTargetId(), req);
                        }
                }
                return map;
        }

        private Map<UUID, List<CompetencyBand>> loadBandsMap() {
                Map<UUID, List<CompetencyBand>> map = new HashMap<>();
                if (competencyBandRepository != null) {
                        for (CompetencyBand cb : competencyBandRepository.findAll()) {
                                if (cb != null && cb.getExam() != null && cb.getExam().getId() != null) {
                                        map.computeIfAbsent(cb.getExam().getId(), k -> new ArrayList<>()).add(cb);
                                }
                        }
                }
                return map;
        }

        private AttemptHistoryResponseDTO mapAttemptHistory(ExamAttempt attempt) {
                return mapAttemptHistory(attempt, List.of(attempt), loadApprovalMap(), loadBandsMap());
        }

        private AttemptHistoryResponseDTO mapAttemptHistory(
                ExamAttempt attempt,
                List<ExamAttempt> candidateAttempts,
                Map<String, ApprovalRequest> approvalMap,
                Map<UUID, List<CompetencyBand>> bandsMap) {

                boolean canAttempt = true;
                int retryDaysLeft = 0;

                boolean overrideExpired = false;
                boolean overrideActive = false;
                if (Boolean.TRUE.equals(attempt.getRetryOverrideApproved()) && attempt.getCandidate() != null) {
                        Optional<ExamAttempt> newerAttempt = candidateAttempts.stream()
                                        .filter(a -> a.getResultStatus() != ResultStatus.IN_PROGRESS 
                                                  && AttemptService.isSameExam(a.getExam(), attempt.getExam())
                                                  && a.getCreatedAt().isAfter(attempt.getCreatedAt()))
                                        .findFirst();
                        if (!newerAttempt.isPresent()) {
                                overrideActive = true;
                        }
                }

                if (!overrideActive && attempt.getCandidate() != null) {
                        String candidateIdStr = attempt.getCandidate().getId().toString();
                        String targetKey = attempt.getExam() != null ? candidateIdStr + ":" + attempt.getExam().getId().toString() : candidateIdStr;

                        ApprovalRequest req = approvalMap.get(targetKey);
                        if (req == null) {
                                req = approvalMap.get(candidateIdStr);
                        }
                        if (req != null) {
                                LocalDateTime approvedAt = req.getResolvedAt();
                                LocalDateTime refTime = attempt.getEndTime() != null ? attempt.getEndTime() : attempt.getCreatedAt();
                                if (approvedAt != null && refTime != null && !refTime.isAfter(approvedAt)) {
                                        int overrideDays = overrideLockDurationDays > 0 ? overrideLockDurationDays : 7;
                                        LocalDateTime expiresAt = approvedAt.plusDays(overrideDays);
                                        if (LocalDateTime.now().isAfter(expiresAt)) {
                                                overrideExpired = true;
                                        } else {
                                                overrideActive = true;
                                        }
                                }
                        }
                }

                if (overrideActive) {
                        canAttempt = true;
                        retryDaysLeft = 0;
                } else {
                        ExamAttempt evalAttempt = attempt;
                        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS && attempt.getCandidate() != null && attempt.getExam() != null) {
                                Optional<ExamAttempt> completedOpt = candidateAttempts.stream()
                                                .filter(a -> a.getResultStatus() != ResultStatus.IN_PROGRESS && AttemptService.isSameExam(a.getExam(), attempt.getExam()))
                                                .findFirst();
                                if (completedOpt.isPresent()) {
                                        evalAttempt = completedOpt.get();
                                }
                        }

                        if (evalAttempt.getResultStatus() != ResultStatus.IN_PROGRESS) {
                                LocalDateTime refTime = evalAttempt.getEndTime() != null ? evalAttempt.getEndTime() : evalAttempt.getCreatedAt();
                                if (refTime != null) {
                                        int lockDays = retryLockDurationDays > 0 ? retryLockDurationDays : 30;
                                        LocalDateTime retryDate = refTime.plusDays(lockDays);
                                        canAttempt = !LocalDateTime.now().isBefore(retryDate);
                                        if (!canAttempt) {
                                                retryDaysLeft = (int) ChronoUnit.DAYS.between(
                                                                LocalDate.now(),
                                                                retryDate.toLocalDate());
                                                if (retryDaysLeft <= 0) retryDaysLeft = 1;
                                        }
                                }
                        }
                }
 
                CompetencyBand band = null;
                if (attempt.getExam() != null && attempt.getAssignedLevel() != null) {
                    List<CompetencyBand> bands = bandsMap.get(attempt.getExam().getId());
                    if (bands != null) {
                        band = bands.stream()
                                .filter(cb -> cb.getLevelName() == attempt.getAssignedLevel())
                                .findFirst()
                                .orElse(null);
                    }
                }
 
                boolean isDecided = attempt.getAdminDecision() != null &&
                        (attempt.getAdminDecision().equals("CONFIRMED") || attempt.getAdminDecision().equals("REJECTED"));

                ResultStatus finalStatus = null;
                String finalLevel = null;
                String finalLevelTitle = null;

                if (isDecided) {
                        if (attempt.getAdminDecision().equals("CONFIRMED")) {
                                finalStatus = attempt.getResultStatus();
                                if (finalStatus == ResultStatus.PASSED) {
                                        finalLevel = attempt.getAssignedLevel() != null ? attempt.getAssignedLevel().name() : "—";
                                        finalLevelTitle = band != null ? band.getTitle() : getDefaultLevelTitle(attempt.getAssignedLevel());
                                } else {
                                        finalLevel = "—";
                                        finalLevelTitle = "Failed";
                                }
                        } else if (attempt.getAdminDecision().equals("REJECTED")) {
                                finalStatus = ResultStatus.FAILED;
                                finalLevel = "—";
                                finalLevelTitle = "Rejected";
                        }
                } else {
                        finalLevel = "—";
                        finalLevelTitle = "Pending Review";
                }

                return AttemptHistoryResponseDTO.builder()
                                .attemptId(attempt.getId())
                                .examId(attempt.getExam() != null ? attempt.getExam().getId() : null)
                                .examTitle(attempt.getExam() != null ? attempt.getExam().getTitle() : "Certification Exam")
                                .stack(attempt.getExam() != null ? attempt.getExam().getStack() : "General")
                                .startedAt(attempt.getStartTime())
                                .submittedAt(attempt.getEndTime())
                                .resultStatus(finalStatus)
                                .resultPublishStatus(attempt.getResultPublishStatus())
                                .assignedLevel(finalLevel)
                                .assignedLevelTitle(finalLevelTitle)
                                .canAttempt(canAttempt)
                                .retryDaysLeft(retryDaysLeft)
                                .build();
        }
 
 
        public List<Map<String, Object>> getNotifications(String username) {
                User candidate = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found."));
 
                List<ExamAttempt> attempts = attemptRepository.findByCandidateIdOrderByEndTimeDesc(candidate.getId());
 
                List<Map<String, Object>> notifs = new ArrayList<>();
                
                // Add override notifications (if any) first so they come top
                List<ApprovalRequest> approvedUnlocks = approvalRepository.findByTypeAndTargetIdStartingWithAndStatus(
                        "CANDIDATE_UNLOCK", candidate.getId().toString(), "APPROVED"
                );
                for (ApprovalRequest req : approvedUnlocks) {
                        LocalDateTime approvedAt = req.getResolvedAt() != null ? req.getResolvedAt() : (req.getRequestedAt() != null ? req.getRequestedAt() : req.getCreatedAt());
                        if (approvedAt != null) {
                                LocalDateTime expiresAt = approvedAt.plusDays(overrideLockDurationDays);
                                String examTitle = "";
                                String[] parts = req.getTargetId().split(":");
                                if (parts.length > 1) {
                                        try {
                                                Optional<Exam> examOpt = examRepository.findById(UUID.fromString(parts[1]));
                                                if (examOpt.isPresent()) {
                                                        examTitle = " for " + examOpt.get().getTitle();
                                                }
                                        } catch (Exception e) {}
                                }
                                if (LocalDateTime.now().isAfter(expiresAt)) {
                                        Map<String, Object> notif = new HashMap<>();
                                        notif.put("id", req.getId() + "-expired");
                                        notif.put("title", "Override Lock Expired");
                                        notif.put("desc", "Your retry lock override period has expired" + examTitle + ". You are now locked from retrying.");
                                        notif.put("time", expiresAt.toString());
                                        notif.put("read", false);
                                        notif.put("unread", true);
                                        notifs.add(notif);
                                } else {
                                        Map<String, Object> notif = new HashMap<>();
                                        notif.put("id", req.getId() + "-approved");
                                        notif.put("title", "Retry Approved");
                                        notif.put("desc", "Your retry lock override request has been approved" + examTitle + ". Please retry before expiration.");
                                        notif.put("time", approvedAt.toString());
                                        notif.put("read", false);
                                        notif.put("unread", true);
                                        notifs.add(notif);
                                }
                        }
                }
 
                for (ExamAttempt attempt : attempts) {
                        // 1. Result published notification
                        if (attempt.getResultPublishStatus() == ResultPublishStatus.PUBLISHED) {
                                Map<String, Object> notif = new HashMap<>();
                                notif.put("id", attempt.getId().toString() + "-published");
                                notif.put("title", "Exam Result Published");
                                if (attempt.getResultStatus() == ResultStatus.PASSED) {
                                        notif.put("desc", "Congratulations! You passed the " + attempt.getExam().getTitle() + " exam.");
                                } else if (attempt.getResultStatus() == ResultStatus.FAILED) {
                                        notif.put("desc", "Your result for the " + attempt.getExam().getTitle() + " exam has been published.");
                                } else {
                                        notif.put("desc", "Your exam for " + attempt.getExam().getTitle() + " has been processed.");
                                }
                                notif.put("time", attempt.getPublishedAt() != null ? attempt.getPublishedAt().toString() : LocalDateTime.now().toString());
                                notif.put("read", false);
                                notif.put("unread", true);
                                notifs.add(notif);
                        }
 
                        // 1.5. Attempt completed / submitted notification (prior to result publish)
                        if (attempt.getResultStatus() != ResultStatus.IN_PROGRESS && 
                            attempt.getResultStatus() != ResultStatus.TERMINATED && 
                            attempt.getResultPublishStatus() != ResultPublishStatus.PUBLISHED) {
                                Map<String, Object> notif = new HashMap<>();
                                notif.put("id", attempt.getId().toString() + "-submitted");
                                notif.put("title", "Exam Completed");
                                notif.put("desc", "Your exam attempt for " + attempt.getExam().getTitle() + " has been successfully completed.");
                                notif.put("time", attempt.getEndTime() != null ? attempt.getEndTime().toString() : LocalDateTime.now().toString());
                                notif.put("read", false);
                                notif.put("unread", true);
                                notifs.add(notif);
                        }
 
                        // 2. Terminated notification
                        if (attempt.getResultStatus() == ResultStatus.TERMINATED) {
                                Map<String, Object> notif = new HashMap<>();
                                notif.put("id", attempt.getId().toString() + "-terminated");
                                notif.put("title", "Exam Attempt Terminated");
                                notif.put("desc", "Your attempt for " + attempt.getExam().getTitle() + " was terminated due to integrity violations.");
                                notif.put("time", attempt.getEndTime() != null ? attempt.getEndTime().toString() : LocalDateTime.now().toString());
                                notif.put("read", false);
                                notif.put("unread", true);
                                notifs.add(notif);
                        }
 
                        // 3. Attempt time expired / deadline reached notification (for active / in-progress attempts)
                        if (attempt.getResultStatus() == ResultStatus.IN_PROGRESS) {
                                LocalDateTime startTime = attempt.getStartTime();
                                int duration = attempt.getExam().getDurationMinutes();
                                if (startTime != null && LocalDateTime.now().isAfter(startTime.plusMinutes(duration))) {
                                        Map<String, Object> notif = new HashMap<>();
                                        notif.put("id", attempt.getId().toString() + "-expired");
                                        notif.put("title", "Exam Deadline Reached");
                                        notif.put("desc", "The time limit for your " + attempt.getExam().getTitle() + " exam has been reached.");
                                        notif.put("time", startTime.plusMinutes(duration).toString());
                                        notif.put("read", false);
                                        notif.put("unread", true);
                                        notifs.add(notif);
                                }
                        }
                }
                return notifs;
        }

        private String getDefaultLevelTitle(CompetencyLevel lvl) {
                if (lvl == null) return "Intermediate";
                return switch (lvl) {
                        case L1 -> "Expert";
                        case L2 -> "Advanced";
                        case L3 -> "Intermediate";
                        case L4 -> "Beginner";
                        case L5 -> "Needs Training";
                };
        }
}