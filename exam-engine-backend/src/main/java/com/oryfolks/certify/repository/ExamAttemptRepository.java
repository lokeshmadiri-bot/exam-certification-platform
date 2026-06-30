package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, UUID> {
    List<ExamAttempt> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);
    Optional<ExamAttempt> findFirstByCandidateIdAndExamIdOrderByCreatedAtDesc(UUID candidateId, UUID examId);
    List<ExamAttempt> findAllByOrderByCreatedAtDesc();
}
