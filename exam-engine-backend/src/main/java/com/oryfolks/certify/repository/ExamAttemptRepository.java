package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.enums.ResultStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.oryfolks.certify.enums.ResultPublishStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, UUID> {
    
    @Query("SELECT ea FROM ExamAttempt ea LEFT JOIN FETCH ea.exam WHERE ea.candidate.id = :candidateId ORDER BY ea.createdAt DESC")
    List<ExamAttempt> findByCandidateIdOrderByCreatedAtDesc(@Param("candidateId") UUID candidateId);

    List<ExamAttempt> findByExamId(UUID examId);

    Optional<ExamAttempt> findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(UUID candidateId, UUID examId);

    @Query("SELECT DISTINCT ea FROM ExamAttempt ea LEFT JOIN FETCH ea.exam LEFT JOIN FETCH ea.candidate ORDER BY ea.createdAt DESC")
    List<ExamAttempt> findAllByOrderByCreatedAtDesc();

    @Query("SELECT ea FROM ExamAttempt ea LEFT JOIN FETCH ea.exam WHERE ea.candidate.id = :candidateId ORDER BY ea.createdAt DESC")
    List<ExamAttempt> findFirstByCandidateIdOrderByCreatedAtDescList(@Param("candidateId") UUID candidateId);

    default Optional<ExamAttempt> findFirstByCandidateIdOrderByCreatedAtDesc(UUID candidateId) {
        List<ExamAttempt> list = findFirstByCandidateIdOrderByCreatedAtDescList(candidateId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    long countByCandidateId(UUID candidateId);

    long countByCandidateIdAndResultStatus(
            UUID candidateId,
            ResultStatus resultStatus);

    long countByCandidateIdAndResultPublishStatus(
            UUID candidateId,
            ResultPublishStatus resultPublishStatus);

    @Query("SELECT ea FROM ExamAttempt ea LEFT JOIN FETCH ea.exam WHERE ea.candidate.id = :candidateId ORDER BY ea.endTime DESC")
    List<ExamAttempt> findByCandidateIdOrderByEndTimeDesc(@Param("candidateId") UUID candidateId);
}
