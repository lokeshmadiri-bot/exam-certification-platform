package com.oryfolks.certify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.oryfolks.certify.CertifyApplication;
import com.oryfolks.certify.dto.ViolationRequestDTO;
import com.oryfolks.certify.entity.ExamAttempt;
import com.oryfolks.certify.enums.ResultStatus;
import com.oryfolks.certify.repository.ExamAttemptRepository;
import com.oryfolks.certify.repository.ExamViolationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = CertifyApplication.class)
@AutoConfigureMockMvc
public class ProctoringControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ExamAttemptRepository examAttemptRepository;

    @Autowired
    private ExamViolationRepository examViolationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @org.junit.jupiter.api.BeforeEach
    public void setupDbSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE exam_attempts ADD IF NOT EXISTS result_publish_status VARCHAR(20) DEFAULT 'PENDING'");
            jdbcTemplate.execute("ALTER TABLE exam_attempts ADD IF NOT EXISTS published_at TIMESTAMP");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS recording_session (id UUID PRIMARY KEY, attempt_id UUID, video_url VARCHAR(500), status VARCHAR(30), started_at TIMESTAMP, ended_at TIMESTAMP)");
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS ai_flag (id UUID PRIMARY KEY, attempt_id UUID, type VARCHAR(50), confidence DOUBLE PRECISION, timestamp TIMESTAMP, snapshot_url VARCHAR(500))");
        } catch (Exception e) {
            System.out.println("Schema update warning: " + e.getMessage());
        }
    }

    @Test
    @WithMockUser(roles = "CANDIDATE")
    public void testViolationsAndTermination() throws Exception {
        ExamAttempt attempt = examAttemptRepository.findAll().stream()
                .filter(a -> a.getResultStatus() == ResultStatus.IN_PROGRESS)
                .findFirst()
                .orElse(null);

        if (attempt == null) {
            attempt = examAttemptRepository.findAll().stream().findFirst().orElse(null);
            if (attempt != null) {
                attempt.setResultStatus(ResultStatus.IN_PROGRESS);
                attempt = examAttemptRepository.save(attempt);
            }
        }

        if (attempt == null) {
            return;
        }

        UUID attemptId = attempt.getId();

        ViolationRequestDTO violationReq = ViolationRequestDTO.builder()
                .type("WINDOW_BLUR")
                .timestamp("2026-07-15T10:35:22")
                .build();

        mockMvc.perform(post("/api/exams/attempts/" + attemptId + "/violations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(violationReq)))
                .andExpect(status().isOk());

        long violationCount = examViolationRepository.countByAttemptId(attemptId);
        assertTrue(violationCount >= 1);

        mockMvc.perform(post("/api/exams/attempts/" + attemptId + "/terminate"))
                .andExpect(status().isOk());

        ExamAttempt updatedAttempt = examAttemptRepository.findById(attemptId).orElse(null);
        assertNotNull(updatedAttempt);
        assertEquals(ResultStatus.TERMINATED, updatedAttempt.getResultStatus());
    }

    @Test
    @WithMockUser(roles = "CANDIDATE")
    public void testSyncStatusAndBeacon() throws Exception {
        ExamAttempt attempt = examAttemptRepository.findAll().stream().findFirst().orElse(null);
        if (attempt == null) return;

        attempt.setResultStatus(ResultStatus.IN_PROGRESS);
        attempt = examAttemptRepository.save(attempt);

        UUID attemptId = attempt.getId();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/exams/attempts/" + attemptId + "/status"))
                .andExpect(status().isOk());

        com.oryfolks.certify.dto.SyncRequestDTO syncReq = com.oryfolks.certify.dto.SyncRequestDTO.builder()
                .answers(java.util.List.of())
                .remainingSeconds(1200L)
                .build();

        mockMvc.perform(post("/api/exams/attempts/" + attemptId + "/sync")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(syncReq)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/exams/attempts/" + attemptId + "/beacon")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(syncReq)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "CANDIDATE")
    public void testProctoringRecordingAndAIFlags() throws Exception {
        ExamAttempt attempt = examAttemptRepository.findAll().stream().findFirst().orElse(null);
        if (attempt == null) return;

        attempt.setResultStatus(ResultStatus.IN_PROGRESS);
        attempt = examAttemptRepository.save(attempt);

        UUID attemptId = attempt.getId();

        java.util.Map<String, Object> startReq = java.util.Map.of("attemptId", attemptId.toString());
        mockMvc.perform(post("/api/proctoring/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isOk());

        java.util.Map<String, Object> flagReq = java.util.Map.of("type", "MULTIPLE_FACE", "confidence", 0.98);
        mockMvc.perform(post("/api/proctoring/flags/" + attemptId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(flagReq)))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/proctoring/flags/" + attemptId))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/proctoring/summary/" + attemptId))
                .andExpect(status().isOk());
    }
}
