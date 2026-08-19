package com.oryfolks.certify.controller;

import com.oryfolks.certify.dto.ApiResponse;
import com.oryfolks.certify.entity.AIFlag;
import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.entity.RecordingSession;
import com.oryfolks.certify.repository.AIFlagRepository;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.ExamViolationRepository;
import com.oryfolks.certify.repository.RecordingSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import com.oryfolks.certify.service.StorageService;

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

    @Autowired
    private StorageService storageService;

    @Autowired
    private ExamAttemptRepository examAttemptRepository;

    @Autowired
    private RecordingSessionRepository recordingSessionRepository;

    @Autowired
    private AIFlagRepository aiFlagRepository;

    @Autowired
    private ExamViolationRepository examViolationRepository;

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startRecordingSession(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) UUID attemptId) {

        UUID targetAttemptId = attemptId;
        if (targetAttemptId == null && body != null && body.containsKey("attemptId")) {
            targetAttemptId = UUID.fromString(body.get("attemptId").toString());
        }

        if (targetAttemptId == null) {
            throw new IllegalArgumentException("attemptId is required");
        }

        final UUID finalAttemptId = targetAttemptId;
        ExamAttempt attempt = examAttemptRepository.findById(finalAttemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + finalAttemptId));

        RecordingSession session = RecordingSession.builder()
                .attempt(attempt)
                .status("IN_PROGRESS")
                .startedAt(LocalDateTime.now())
                .build();

        session = recordingSessionRepository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("status", session.getStatus());

        return ResponseEntity.ok(ApiResponse.success("Recording session started", response));
    }

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadRecording(
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam("attemptId") UUID attemptId,
            @RequestParam(value = "sessionId", required = false) UUID sessionId) {

        MultipartFile videoFile = video != null ? video : file;

        System.out.println("[Recording] Upload request received — attemptId=" + attemptId
                + " sessionId=" + sessionId
                + " fileSize=" + (videoFile != null ? videoFile.getSize() : 0) + " bytes");

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        String savedPath = null;

        if (videoFile != null && !videoFile.isEmpty()) {
            // 1. Try MinIO / cloud storage first
            try {
                savedPath = storageService.uploadFile(videoFile, "recordings");
                System.out.println("[Recording] MinIO upload SUCCESS — path=" + savedPath);
            } catch (Exception e) {
                System.err.println("[Recording] MinIO upload FAILED: " + e.getMessage());
                // 2. Fallback: save to local disk
                try {
                    Path uploadDir = Paths.get("uploads/recordings");
                    if (!Files.exists(uploadDir)) {
                        Files.createDirectories(uploadDir);
                    }
                    Path filePath = uploadDir.resolve(attemptId + "_" + System.currentTimeMillis() + ".webm");
                    videoFile.transferTo(filePath.toAbsolutePath().toFile());
                    savedPath = "uploads/recordings/" + filePath.getFileName().toString();
                    System.out.println("[Recording] Local fallback save SUCCESS — path=" + savedPath);
                } catch (IOException ioEx) {
                    System.err.println("[Recording] Local fallback FAILED: " + ioEx.getMessage());
                    // savedPath stays null — session will be marked FAILED
                }
            }
        } else {
            System.err.println("[Recording] Upload called with empty/null video file for attempt=" + attemptId);
        }

        // Locate or create the recording session
        RecordingSession session = null;
        if (sessionId != null) {
            session = recordingSessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                System.err.println("[Recording] WARNING: sessionId " + sessionId + " not found in DB");
            }
        }
        if (session == null) {
            List<RecordingSession> sessions = recordingSessionRepository.findByAttemptId(attemptId);
            if (!sessions.isEmpty()) {
                // Pick the most recent IN_PROGRESS session first; otherwise take the last one
                session = sessions.stream()
                        .filter(s -> "IN_PROGRESS".equals(s.getStatus()))
                        .reduce((first, second) -> second) // last IN_PROGRESS
                        .orElse(sessions.get(sessions.size() - 1));
                System.out.println("[Recording] Resolved session from DB: id=" + session.getId());
            }
        }
        if (session == null) {
            System.out.println("[Recording] No existing session found, creating a new one");
            session = RecordingSession.builder()
                    .attempt(attempt)
                    .startedAt(LocalDateTime.now())
                    .build();
        }

        // Update session status based on whether the upload succeeded
        if (savedPath != null) {
            session.setStatus("COMPLETED");
            session.setVideoUrl(savedPath);
            session.setEndedAt(LocalDateTime.now());
            System.out.println("[Recording] Session " + session.getId() + " → COMPLETED, videoUrl=" + savedPath);
        } else {
            session.setStatus("FAILED");
            session.setEndedAt(LocalDateTime.now());
            System.err.println("[Recording] Session " + session.getId() + " → FAILED (no video stored)");
        }

        try {
            recordingSessionRepository.save(session);
        } catch (Exception dbEx) {
            System.err.println("[Recording] DB save of session failed: " + dbEx.getMessage());
            // Still return success to the frontend if the video was stored — DB issue is non-blocking
        }

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("videoUrl", savedPath != null ? savedPath : "");
        response.put("status", session.getStatus());

        String message = savedPath != null ? "Recording uploaded successfully" : "Recording upload failed — no video stored";
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    @GetMapping("/flags/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAIFlags(@PathVariable UUID attemptId) {
        List<AIFlag> flags = aiFlagRepository.findByAttemptId(attemptId);

        List<Map<String, Object>> flagList = flags.stream().map(flag -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", flag.getId());
            map.put("type", flag.getType());
            map.put("confidence", flag.getConfidence());
            map.put("time", flag.getTimestamp() != null ? flag.getTimestamp().toString() : "");
            map.put("snapshotUrl", flag.getSnapshotUrl());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("flags", flagList);

        return ResponseEntity.ok(ApiResponse.success("AI flags retrieved", response));
    }

    @PostMapping("/flags/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> recordAIFlag(
            @PathVariable UUID attemptId,
            @RequestBody Map<String, Object> body) {

        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        String type = body.getOrDefault("type", "UNKNOWN_VIOLATION").toString();
        Double confidence = 0.95;
        if (body.containsKey("confidence")) {
            confidence = Double.parseDouble(body.get("confidence").toString());
        }
        String snapshotUrl = body.containsKey("snapshotUrl") ? body.get("snapshotUrl").toString() : null;

        AIFlag flag = AIFlag.builder()
                .attempt(attempt)
                .type(type)
                .confidence(confidence)
                .snapshotUrl(snapshotUrl)
                .build();

        flag = aiFlagRepository.save(flag);

        Map<String, Object> response = new HashMap<>();
        response.put("id", flag.getId());
        response.put("type", flag.getType());
        response.put("confidence", flag.getConfidence());
        response.put("timestamp", flag.getTimestamp() != null ? flag.getTimestamp().toString() : "");
        response.put("snapshotUrl", flag.getSnapshotUrl());

        return ResponseEntity.ok(ApiResponse.success("AI flag recorded", response));
    }

    @GetMapping("/summary/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProctoringSummary(@PathVariable UUID attemptId) {
        long warningsCount = examViolationRepository.countByAttemptId(attemptId);
        List<AIFlag> flags = aiFlagRepository.findByAttemptId(attemptId);

        Map<String, Long> typeCounts = flags.stream()
                .collect(Collectors.groupingBy(AIFlag::getType, Collectors.counting()));

        List<Map<String, Object>> aiFlagsSummary = new ArrayList<>();
        for (Map.Entry<String, Long> entry : typeCounts.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            item.put("type", entry.getKey());
            item.put("count", entry.getValue());
            aiFlagsSummary.add(item);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("warnings", warningsCount);
        response.put("aiFlags", aiFlagsSummary);
        response.put("totalFlags", flags.size());

        return ResponseEntity.ok(ApiResponse.success("Proctoring summary retrieved", response));
    }

    /**
     * POST /api/proctoring/snapshot/{attemptId}
     *
     * Accepts a JPEG snapshot captured from the candidate's camera at violation time.
     * Uploads it to MinIO under the "snapshots/" prefix and returns the public URL.
     * This URL is subsequently stored in the AIFlag.snapshotUrl field via the flags endpoint.
     */
    @PostMapping("/snapshot/{attemptId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadViolationSnapshot(
            @PathVariable UUID attemptId,
            @RequestParam("snapshot") MultipartFile snapshot) {

        // Validate attempt exists
        examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        Map<String, Object> response = new HashMap<>();

        if (snapshot == null || snapshot.isEmpty()) {
            response.put("snapshotUrl", null);
            return ResponseEntity.ok(ApiResponse.success("No snapshot provided", response));
        }

        try {
            String snapshotUrl = storageService.uploadFile(snapshot, "snapshots");
            response.put("snapshotUrl", snapshotUrl);
            return ResponseEntity.ok(ApiResponse.success("Snapshot uploaded successfully", response));
        } catch (Exception e) {
            System.err.println("[ProctoringController] Snapshot upload failed for attempt " + attemptId + ": " + e.getMessage());
            // Return gracefully — snapshot failure must not block the exam flow
            response.put("snapshotUrl", null);
            response.put("error", "Snapshot upload failed: " + e.getMessage());
            return ResponseEntity.ok(ApiResponse.success("Snapshot upload failed (non-critical)", response));
        }
    }
}
