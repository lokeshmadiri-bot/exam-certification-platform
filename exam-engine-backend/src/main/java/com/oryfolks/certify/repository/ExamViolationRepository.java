package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ExamViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamViolationRepository extends JpaRepository<ExamViolation, UUID> {
    List<ExamViolation> findByAttemptIdOrderByCreatedAtAsc(UUID attemptId);
    long countByAttemptId(UUID attemptId);
}
