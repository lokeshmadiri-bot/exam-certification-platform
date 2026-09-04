package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.AIFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AIFlagRepository extends JpaRepository<AIFlag, UUID> {
    List<AIFlag> findByAttemptId(UUID attemptId);
    long countByAttemptId(UUID attemptId);
    void deleteByAttemptId(UUID attemptId);

    @Query("SELECT af.attempt.id, COUNT(af) FROM AIFlag af WHERE af.attempt.id IN :attemptIds GROUP BY af.attempt.id")
    List<Object[]> countByAttemptIdsGrouped(@Param("attemptIds") List<UUID> attemptIds);
}
