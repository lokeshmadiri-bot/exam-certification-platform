package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.AttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttemptAnswerRepository extends JpaRepository<AttemptAnswer, UUID> {

    @Query("SELECT aa FROM AttemptAnswer aa JOIN FETCH aa.question WHERE aa.attempt.id = :attemptId")
    List<AttemptAnswer> findByAttemptId(@Param("attemptId") UUID attemptId);

    void deleteByAttemptId(UUID attemptId);

    long countByAttemptId(UUID attemptId);

}