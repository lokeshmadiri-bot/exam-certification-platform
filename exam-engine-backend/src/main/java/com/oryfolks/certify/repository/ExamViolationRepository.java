package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ExamViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamViolationRepository extends JpaRepository<ExamViolation, UUID> {
    List<ExamViolation> findByAttemptIdOrderByCreatedAtAsc(UUID attemptId);
    long countByAttemptId(UUID attemptId);
    void deleteByAttemptId(UUID attemptId);

    @Query("SELECT ev.attempt.id, COUNT(ev) FROM ExamViolation ev WHERE ev.attempt.id IN :attemptIds GROUP BY ev.attempt.id")
    List<Object[]> countByAttemptIdsGrouped(@Param("attemptIds") List<UUID> attemptIds);
}
