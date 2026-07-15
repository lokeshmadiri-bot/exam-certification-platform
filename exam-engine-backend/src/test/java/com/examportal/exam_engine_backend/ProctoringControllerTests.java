package com.examportal.exam_engine_backend;

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
            jdbcTemplate.execute("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS result_publish_status VARCHAR(20) DEFAULT 'PENDING'");
            jdbcTemplate.execute("ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP");
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
}
