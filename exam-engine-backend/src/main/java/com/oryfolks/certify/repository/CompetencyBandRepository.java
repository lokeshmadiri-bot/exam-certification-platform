package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.CompetencyBand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompetencyBandRepository extends JpaRepository<CompetencyBand, UUID> {
    List<CompetencyBand> findByExamId(UUID examId);
}
