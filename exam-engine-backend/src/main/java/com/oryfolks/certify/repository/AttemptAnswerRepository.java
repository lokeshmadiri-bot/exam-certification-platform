package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.AttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, UUID> {

    List<AttemptAnswer> findByAttemptId(UUID attemptId);

    void deleteByAttemptId(UUID attemptId);

    long countByAttemptId(UUID attemptId);

}