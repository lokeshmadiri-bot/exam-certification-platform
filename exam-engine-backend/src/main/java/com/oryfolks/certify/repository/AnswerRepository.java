package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, UUID> {
    List<Answer> findByAttemptId(UUID attemptId);
    Optional<Answer> findByAttemptIdAndQuestionId(UUID attemptId, UUID questionId);
    void deleteByAttemptId(UUID attemptId);
}
