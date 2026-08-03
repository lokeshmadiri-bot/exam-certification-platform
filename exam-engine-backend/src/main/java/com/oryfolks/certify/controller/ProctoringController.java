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

@RestController
@RequestMapping("/api/proctoring")
public class ProctoringController {

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
        
        ExamAttempt attempt = examAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new RuntimeException("Attempt not found: " + attemptId));

        String savedPath = "uploads/recordings/" + attemptId + "_" + System.currentTimeMillis() + ".webm";

        try {
            if (videoFile != null && !videoFile.isEmpty()) {
                Path uploadDir = Paths.get("uploads/recordings");
                if (!Files.exists(uploadDir)) {
                    Files.createDirectories(uploadDir);
                }
                Path filePath = uploadDir.resolve(attemptId + "_" + System.currentTimeMillis() + ".webm");
                videoFile.transferTo(filePath.toFile());
                savedPath = filePath.toString();
            }
        } catch (IOException e) {
            System.err.println("Warning: failed to save video payload to disk: " + e.getMessage());
        }

        RecordingSession session = null;
        if (sessionId != null) {
            session = recordingSessionRepository.findById(sessionId).orElse(null);
        }
        if (session == null) {
            List<RecordingSession> sessions = recordingSessionRepository.findByAttemptId(attemptId);
            if (!sessions.isEmpty()) {
                session = sessions.get(sessions.size() - 1);
            }
        }

        if (session == null) {
            session = RecordingSession.builder()
                    .attempt(attempt)
                    .startedAt(LocalDateTime.now())
                    .build();
        }

        session.setStatus("COMPLETED");
        session.setVideoUrl(savedPath);
        session.setEndedAt(LocalDateTime.now());
        recordingSessionRepository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("videoUrl", savedPath);
        response.put("status", "COMPLETED");

        return ResponseEntity.ok(ApiResponse.success("Recording uploaded successfully", response));
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
}
