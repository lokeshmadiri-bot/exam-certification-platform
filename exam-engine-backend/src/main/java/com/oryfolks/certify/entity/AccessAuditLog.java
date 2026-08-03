package com.oryfolks.certify.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "access_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccessAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "user_name", length = 100)
    private String userName;

    @NotBlank(message = "Action is required.")
    @Column(nullable = false, length = 255)
    private String action;

    @Column(name = "module", length = 100)
    private String module;

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public String getUser() {
        if (userName != null && !userName.isBlank()) return userName;
        return user != null ? (user.getFullName() != null ? user.getFullName() : user.getUsername()) : "Admin User";
    }

    public LocalDateTime getDate() {
        return createdAt;
    }

}