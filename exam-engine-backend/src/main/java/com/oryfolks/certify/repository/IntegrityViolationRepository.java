package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.IntegrityViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IntegrityViolationRepository extends JpaRepository<IntegrityViolation, UUID> {
    List<IntegrityViolation> findByAttemptIdOrderByCreatedAtAsc(UUID attemptId);
}
