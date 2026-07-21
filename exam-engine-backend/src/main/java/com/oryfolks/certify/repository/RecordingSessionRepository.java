package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.RecordingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RecordingSessionRepository extends JpaRepository<RecordingSession, UUID> {
    List<RecordingSession> findByAttemptId(UUID attemptId);
}
