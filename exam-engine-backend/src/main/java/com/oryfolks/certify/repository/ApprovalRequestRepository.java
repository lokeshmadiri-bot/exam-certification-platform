package com.oryfolks.certify.repository;

import com.oryfolks.certify.entity.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import java.util.Optional;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, String> {
    List<ApprovalRequest> findByStatusOrderByRequestedAtDesc(String status);
    void deleteByTargetId(String targetId);
    Optional<ApprovalRequest> findFirstByTargetIdAndStatus(String targetId, String status);
    Optional<ApprovalRequest> findFirstByTypeAndStatus(String type, String status);
    Optional<ApprovalRequest> findFirstByTypeAndTargetIdAndStatus(String type, String targetId, String status);
}
