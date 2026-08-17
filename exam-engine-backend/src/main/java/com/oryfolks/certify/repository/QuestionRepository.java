package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByExamIdAndIsActiveTrue(UUID examId);
    List<Question> findByExamId(UUID examId);
    long countByExamIdAndIsActiveTrue(UUID examId);
    long countByExamId(UUID examId);
    List<Question> findByStackIgnoreCaseAndIsActiveTrue(String stack);
    List<Question> findByStackIgnoreCase(String stack);
    List<Question> findByIsActiveTrue();
    List<Question> findAllByOrderByCreatedAtDesc();
}
