package com.oryfolks.certify.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "governance_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GovernanceSetting {

    @Id
    private Long id = 1L;

    @Builder.Default
    @Column(name = "retention_days", nullable = false)
    private Integer retentionDays = 180;

    @Builder.Default
    @Column(name = "encryption", nullable = false)
    private Boolean encryption = true;

    @Builder.Default
    @Column(name = "watermark", nullable = false)
    private Boolean watermark = true;

    @Builder.Default
    @Column(name = "ai_flag_but_do_not_fail", nullable = false)
    private Boolean flagNotFail = true;

    @Builder.Default
    @Column(name = "ai_sensitivity", nullable = false, length = 20)
    private String sensitivity = "MEDIUM";

    @Builder.Default
    @Column(name = "face_detection_interval_sec")
    private Integer faceDetectionIntervalSec = 3;

    @Builder.Default
    @Column(name = "detection_confidence")
    private Double detectionConfidence = 0.2;

    @Builder.Default
    @Column(name = "gaze_deviation_deg")
    private Integer gazeDeviationDeg = 35;

    @Builder.Default
    @Column(name = "absence_trigger_misses")
    private Integer absenceTriggerMisses = 5;

    @Builder.Default
    @Column(name = "alert_window_sec")
    private Integer alertWindowSec = 15;

    @Builder.Default
    @Column(name = "snapshot_resolution", length = 30)
    private String snapshotResolution = "160x120";

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
