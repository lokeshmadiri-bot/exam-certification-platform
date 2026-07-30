package com.oryfolks.certify.controller;

import com.oryfolks.certify.entity.AccessAuditLog;
import com.oryfolks.certify.entity.ApprovalRequest;
import com.oryfolks.certify.entity.GovernanceSetting;
import com.oryfolks.certify.repository.AccessAuditLogRepository;
import com.oryfolks.certify.repository.ApprovalRequestRepository;
import com.oryfolks.certify.repository.GovernanceSettingRepository;
import com.oryfolks.certify.response.ApiResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/admin/governance")
@PreAuthorize("hasRole('ADMIN')")
public class GovernanceController {

    @Autowired
    private GovernanceSettingRepository governanceSettingRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    private GovernanceSetting getOrInitSettings() {
        List<GovernanceSetting> all = governanceSettingRepository.findAll();
        if (all.isEmpty()) {
            return governanceSettingRepository.save(GovernanceSetting.builder().build());
        }
        return all.get(0);
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGovernanceSettings() {
        GovernanceSetting gs = getOrInitSettings();

        Map<String, Object> security = new HashMap<>();
        security.put("encryption", gs.getEncryption());
        security.put("watermark", gs.getWatermark());

        Map<String, Object> aiSettings = new HashMap<>();
        aiSettings.put("flagNotFail", gs.getFlagNotFail());
        aiSettings.put("sensitivity", gs.getSensitivity());

        Map<String, Object> aiParameters = new HashMap<>();
        aiParameters.put("faceDetectionIntervalSec", gs.getFaceDetectionIntervalSec());
        aiParameters.put("detectionConfidence", gs.getDetectionConfidence());
        aiParameters.put("gazeDeviationDeg", gs.getGazeDeviationDeg());
        aiParameters.put("absenceTriggerMisses", gs.getAbsenceTriggerMisses());
        aiParameters.put("alertWindowSec", gs.getAlertWindowSec());
        aiParameters.put("snapshotResolution", gs.getSnapshotResolution());

        Map<String, Object> result = new HashMap<>();
        result.put("retentionDays", gs.getRetentionDays());
        result.put("pendingRetentionChange", null);
        result.put("security", security);
        result.put("aiSettings", aiSettings);
        result.put("aiParameters", aiParameters);

        return ResponseEntity.ok(ApiResponse.success("Governance settings retrieved", result));
    }

    @PutMapping("/security")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSecurity(
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        GovernanceSetting gs = getOrInitSettings();

        // Capture previous values for audit log
        String oldEncryption = String.valueOf(gs.getEncryption());
        String oldWatermark = String.valueOf(gs.getWatermark());

        if (payload.containsKey("encryption")) {
            gs.setEncryption(Boolean.parseBoolean(payload.get("encryption").toString()));
        }
        if (payload.containsKey("watermark")) {
            gs.setWatermark(Boolean.parseBoolean(payload.get("watermark").toString()));
        }
        governanceSettingRepository.save(gs);

        String oldValue = String.format("encryption=%s, watermark=%s", oldEncryption, oldWatermark);
        String newValue = String.format("encryption=%s, watermark=%s", gs.getEncryption(), gs.getWatermark());

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("UPDATE_SECURITY")
                .module("Governance")
                .oldValue(oldValue)
                .newValue(newValue)
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("encryption", gs.getEncryption());
        res.put("watermark", gs.getWatermark());
        return ResponseEntity.ok(ApiResponse.success("Security settings updated", res));
    }

    @PutMapping("/ai-settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAISettings(
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        GovernanceSetting gs = getOrInitSettings();

        // Capture previous values for audit log
        String oldSensitivity = gs.getSensitivity();
        String oldFlagNotFail = String.valueOf(gs.getFlagNotFail());

        if (payload.containsKey("flagNotFail")) {
            gs.setFlagNotFail(Boolean.parseBoolean(payload.get("flagNotFail").toString()));
        }
        if (payload.containsKey("sensitivity")) {
            gs.setSensitivity(payload.get("sensitivity").toString());
        }
        governanceSettingRepository.save(gs);

        String oldValue = String.format("sensitivity=%s, flagNotFail=%s", oldSensitivity, oldFlagNotFail);
        String newValue = String.format("sensitivity=%s, flagNotFail=%s", gs.getSensitivity(), gs.getFlagNotFail());

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("UPDATE_AI_SETTINGS")
                .module("Governance")
                .oldValue(oldValue)
                .newValue(newValue)
                .build());

        Map<String, Object> res = new HashMap<>();
        res.put("flagNotFail", gs.getFlagNotFail());
        res.put("sensitivity", gs.getSensitivity());
        return ResponseEntity.ok(ApiResponse.success("AI settings updated", res));
    }

    @PutMapping("/ai-parameters")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateAIParameters(
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        GovernanceSetting gs = getOrInitSettings();

        // Capture previous values for audit log
        String oldValue = String.format(
                "faceDetectionIntervalSec=%d, detectionConfidence=%.2f, gazeDeviationDeg=%d, " +
                "absenceTriggerMisses=%d, alertWindowSec=%d, snapshotResolution=%s",
                gs.getFaceDetectionIntervalSec(), gs.getDetectionConfidence(),
                gs.getGazeDeviationDeg(), gs.getAbsenceTriggerMisses(),
                gs.getAlertWindowSec(), gs.getSnapshotResolution());

        if (payload.containsKey("faceDetectionIntervalSec")) {
            gs.setFaceDetectionIntervalSec(Integer.parseInt(payload.get("faceDetectionIntervalSec").toString()));
        }
        if (payload.containsKey("detectionConfidence")) {
            gs.setDetectionConfidence(Double.parseDouble(payload.get("detectionConfidence").toString()));
        }
        if (payload.containsKey("gazeDeviationDeg")) {
            gs.setGazeDeviationDeg(Integer.parseInt(payload.get("gazeDeviationDeg").toString()));
        }
        if (payload.containsKey("absenceTriggerMisses")) {
            gs.setAbsenceTriggerMisses(Integer.parseInt(payload.get("absenceTriggerMisses").toString()));
        }
        if (payload.containsKey("alertWindowSec")) {
            gs.setAlertWindowSec(Integer.parseInt(payload.get("alertWindowSec").toString()));
        }
        if (payload.containsKey("snapshotResolution")) {
            gs.setSnapshotResolution(payload.get("snapshotResolution").toString());
        }
        governanceSettingRepository.save(gs);

        String newValue = String.format(
                "faceDetectionIntervalSec=%d, detectionConfidence=%.2f, gazeDeviationDeg=%d, " +
                "absenceTriggerMisses=%d, alertWindowSec=%d, snapshotResolution=%s",
                gs.getFaceDetectionIntervalSec(), gs.getDetectionConfidence(),
                gs.getGazeDeviationDeg(), gs.getAbsenceTriggerMisses(),
                gs.getAlertWindowSec(), gs.getSnapshotResolution());

        auditLogRepository.save(AccessAuditLog.builder()
                .userName(principal != null ? principal.getName() : "Admin User")
                .action("UPDATE_AI_PARAMETERS")
                .module("Governance")
                .oldValue(oldValue)
                .newValue(newValue)
                .build());

        Map<String, Object> aiParameters = new HashMap<>();
        aiParameters.put("faceDetectionIntervalSec", gs.getFaceDetectionIntervalSec());
        aiParameters.put("detectionConfidence", gs.getDetectionConfidence());
        aiParameters.put("gazeDeviationDeg", gs.getGazeDeviationDeg());
        aiParameters.put("absenceTriggerMisses", gs.getAbsenceTriggerMisses());
        aiParameters.put("alertWindowSec", gs.getAlertWindowSec());
        aiParameters.put("snapshotResolution", gs.getSnapshotResolution());

        return ResponseEntity.ok(ApiResponse.success("AI parameters updated", aiParameters));
    }

    @PostMapping("/retention/request")
    public ResponseEntity<ApiResponse<Map<String, Object>>> requestRetentionChange(
            @RequestBody Map<String, Object> body,
            Principal principal) {

        GovernanceSetting gs = getOrInitSettings();
        int days = Integer.parseInt(body.get("days").toString());
        String note = body.getOrDefault("note", "").toString();

        ApprovalRequest req = ApprovalRequest.builder()
                .id(UUID.randomUUID().toString())
                .type("RETENTION_CHANGE")
                .label("Change retention policy → " + days + " days")
                .targetId("governance")
                .requestedBy(principal != null ? principal.getName() : "Admin User")
                .note(note)
                .status("PENDING")
                .payloadJson(days + ":" + gs.getRetentionDays())
                .requestedAt(java.time.LocalDateTime.now())
                .createdAt(java.time.LocalDateTime.now())
                .build();

        ApprovalRequest saved = approvalRepository.save(req);

        Map<String, Object> res = new HashMap<>();
        res.put("ok", true);
        res.put("approval", saved);
        return ResponseEntity.ok(ApiResponse.success("Retention change requested", res));
    }

    @GetMapping("/audit-log")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAuditLog(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String user) {

        List<AccessAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc();

        if (module != null && !module.isBlank()) {
            logs = logs.stream().filter(l -> l.getModule() != null && l.getModule().equalsIgnoreCase(module)).toList();
        }
        if (user != null && !user.isBlank()) {
            logs = logs.stream().filter(l -> l.getUser().toLowerCase().contains(user.toLowerCase())).toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", logs);
        result.put("total", logs.size());
        return ResponseEntity.ok(ApiResponse.success("Audit log retrieved", result));
    }
}
