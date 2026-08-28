package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ExamAttemptQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamAttemptQuestionRepository extends JpaRepository<ExamAttemptQuestion, UUID> {

    List<ExamAttemptQuestion> findByAttemptIdOrderByQuestionOrderAsc(UUID attemptId);

    void deleteByAttemptId(UUID attemptId);

    boolean existsByQuestionId(UUID questionId);

}
