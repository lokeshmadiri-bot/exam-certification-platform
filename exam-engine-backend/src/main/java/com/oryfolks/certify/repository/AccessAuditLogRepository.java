package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.AccessAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AccessAuditLogRepository extends JpaRepository<AccessAuditLog, UUID> {
    List<AccessAuditLog> findAllByOrderByCreatedAtDesc();
}
