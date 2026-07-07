package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.enums.ExamStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExamRepository extends JpaRepository<Exam, UUID> {

    List<Exam> findByStack(String stack);

    List<Exam> findByStatus(ExamStatus status);
}
