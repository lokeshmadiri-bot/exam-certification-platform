package com.oryfolks.certify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "recording_session")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", nullable = false)
    private ExamAttempt attempt;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "status", length = 30)
    private String status;

    @CreationTimestamp
    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
