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
public class GovernanceController {

    @Autowired
    private GovernanceSettingRepository governanceSettingRepository;

    @Autowired
    private AccessAuditLogRepository auditLogRepository;

    @Autowired
    private ApprovalRequestRepository approvalRepository;

    private GovernanceSetting getOrInitSettings() {
        List<GovernanceSetting> all = governanceSettingRepository.findAll();
        GovernanceSetting gs;
        if (all.isEmpty()) {
            gs = new GovernanceSetting();
            gs.setId(1L);
            gs.setRetentionDays(180);
            gs.setEncryption(true);
            gs.setWatermark(true);
            gs.setFlagNotFail(true);
            gs.setSensitivity("MEDIUM");
            gs.setFaceDetectionIntervalSec(3);
            gs.setDetectionConfidence(0.20);
            gs.setGazeDeviationDeg(35);
            gs.setAbsenceTriggerMisses(5);
            gs.setAlertWindowSec(15);
            gs.setSnapshotResolution("160x120");
            return governanceSettingRepository.save(gs);
        } else {
            gs = all.get(0);
        }
        if (gs.getRetentionDays() == null) gs.setRetentionDays(180);
        if (gs.getEncryption() == null) gs.setEncryption(true);
        if (gs.getWatermark() == null) gs.setWatermark(true);
        if (gs.getFlagNotFail() == null) gs.setFlagNotFail(true);
        if (gs.getSensitivity() == null) gs.setSensitivity("MEDIUM");
        if (gs.getFaceDetectionIntervalSec() == null) gs.setFaceDetectionIntervalSec(3);
        if (gs.getDetectionConfidence() == null) gs.setDetectionConfidence(0.20);
        if (gs.getGazeDeviationDeg() == null) gs.setGazeDeviationDeg(35);
        if (gs.getAbsenceTriggerMisses() == null) gs.setAbsenceTriggerMisses(5);
        if (gs.getAlertWindowSec() == null) gs.setAlertWindowSec(15);
        if (gs.getSnapshotResolution() == null) gs.setSnapshotResolution("160x120");
        return gs;
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

        Optional<ApprovalRequest> pendingRet = approvalRepository.findFirstByTypeAndStatus("RETENTION_CHANGE", "PENDING");

        Map<String, Object> result = new HashMap<>();
        result.put("retentionDays", gs.getRetentionDays());
        result.put("pendingRetentionChange", pendingRet.map(ApprovalRequest::getId).orElse(null));
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
            @RequestBody(required = false) Map<String, Object> body,
            Principal principal) {
        try {
            if (approvalRepository.findFirstByTypeAndStatus("RETENTION_CHANGE", "PENDING").isPresent()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("A retention policy change request is already pending approval."));
            }

            GovernanceSetting gs = getOrInitSettings();
            Object daysObj = body != null ? body.get("days") : null;
            int days = daysObj != null ? Integer.parseInt(daysObj.toString()) : 180;
            String note = (body != null && body.get("note") != null) ? body.get("note").toString() : "";

            ApprovalRequest req = ApprovalRequest.builder()
                    .type("RETENTION_CHANGE")
                    .label("Change retention policy → " + days + " days")
                    .targetId("governance")
                    .requestedBy(principal != null && principal.getName() != null ? principal.getName() : "Admin User")
                    .note(note)
                    .status("PENDING")
                    .payloadJson(days + ":" + (gs != null && gs.getRetentionDays() != null ? gs.getRetentionDays() : 180))
                    .requestedAt(java.time.LocalDateTime.now())
                    .createdAt(java.time.LocalDateTime.now())
                    .build();

            ApprovalRequest saved = approvalRepository.save(req);

            Map<String, Object> res = new HashMap<>();
            res.put("ok", true);
            res.put("approval", saved);
            return ResponseEntity.ok(ApiResponse.success("Retention change requested", res));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to request retention change: " + e.getMessage()));
        }
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
            logs = logs.stream().filter(l -> l.getUserName() != null && l.getUserName().toLowerCase().contains(user.toLowerCase())).toList();
        }

        Map<String, Object> result = new HashMap<>();
        result.put("rows", logs);
        result.put("total", logs.size());
        return ResponseEntity.ok(ApiResponse.success("Audit log retrieved", result));
    }
}
