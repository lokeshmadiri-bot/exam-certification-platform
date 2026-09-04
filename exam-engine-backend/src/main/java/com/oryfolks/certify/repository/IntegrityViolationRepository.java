package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.IntegrityViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IntegrityViolationRepository extends JpaRepository<IntegrityViolation, UUID> {
    List<IntegrityViolation> findByAttemptIdOrderByCreatedAtAsc(UUID attemptId);
    long countByAttemptId(UUID attemptId);
    void deleteByAttemptId(UUID attemptId);

    @Query("SELECT iv.attempt.id, COUNT(iv) FROM IntegrityViolation iv WHERE iv.attempt.id IN :attemptIds GROUP BY iv.attempt.id")
    List<Object[]> countByAttemptIdsGrouped(@Param("attemptIds") List<UUID> attemptIds);
}
