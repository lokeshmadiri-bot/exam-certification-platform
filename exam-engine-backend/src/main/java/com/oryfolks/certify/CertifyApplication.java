package com.oryfolks.certify;

import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class CertifyApplication {

        public static void main(String[] args) {
                SpringApplication.run(CertifyApplication.class, args);
        }

        @Bean
        public static CommandLineRunner initDatabase(UserRepository userRepository,
                        ExamRepository examRepository,
                        JdbcTemplate jdbc,
                        PasswordEncoder passwordEncoder) {
                return args -> {
                        // 1. Ensure default users exist and roles are synchronized
                        java.util.Optional<User> aaravOpt = userRepository.findByUsername("aarav");
                        if (aaravOpt.isEmpty()) {
                                userRepository.save(User.builder()
                                                .username("aarav")
                                                .password(passwordEncoder.encode("password123"))
                                                .role(UserRole.ROLE_ADMIN)
                                                .fullName("Aarav Mehta")
                                                .title("QA Automation Engineer")
                                                .build());
                        } else {
                                User aarav = aaravOpt.get();
                                aarav.setPassword(passwordEncoder.encode("password123"));
                                aarav.setRole(UserRole.ROLE_ADMIN);
                                userRepository.save(aarav);
                        }

                        java.util.Optional<User> raviOpt = userRepository.findByUsername("ravi");
                        if (raviOpt.isEmpty()) {
                                userRepository.save(User.builder()
                                                .username("ravi")
                                                .password(passwordEncoder.encode("password123"))
                                                .role(UserRole.ROLE_CANDIDATE)
                                                .fullName("Ravi Khanna")
                                                .title("L&D Administrator")
                                                .build());
                        } else {
                                User ravi = raviOpt.get();
                                ravi.setPassword(passwordEncoder.encode("password123"));
                                ravi.setRole(UserRole.ROLE_CANDIDATE);
                                userRepository.save(ravi);
                        }

                        // 2. Remove seeded dummy exams — only show admin-created exams in library.
                        // Uses native SQL for correct FK cascade ordering across all dependent tables.
                        String[] dummyTitles = { "Selenium Certification", "API Testing", "DevOps" };
                        for (String title : dummyTitles) {
                                String findExamSql = "SELECT id FROM exams WHERE title = ?";
                                var ids = jdbc.queryForList(findExamSql, String.class, title);
                                for (String examId : ids) {
                                        // Delete all child data in FK-safe order
                                        String attemptsSql = "SELECT id FROM exam_attempts WHERE exam_id = CAST(? AS uuid)";
                                        var attemptIds = jdbc.queryForList(attemptsSql, String.class, examId);
                                        for (String attemptId : attemptIds) {
                                                String uuid = attemptId;
                                                jdbc.update("DELETE FROM ai_flag WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                                jdbc.update("DELETE FROM exam_violation WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                                jdbc.update("DELETE FROM integrity_violations WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                                jdbc.update("DELETE FROM recording_session WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                                jdbc.update("DELETE FROM attempt_answers WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                                jdbc.update("DELETE FROM answers WHERE attempt_id = CAST(? AS uuid)",
                                                                uuid);
                                        }
                                        jdbc.update("DELETE FROM exam_attempts WHERE exam_id = CAST(? AS uuid)",
                                                        examId);
                                        jdbc.update("DELETE FROM sections WHERE exam_id = CAST(? AS uuid)", examId);
                                        jdbc.update("DELETE FROM questions WHERE exam_id = CAST(? AS uuid)", examId);
                                        jdbc.update("DELETE FROM approval_requests WHERE target_id = ?", examId);
                                        jdbc.update("DELETE FROM competency_bands WHERE exam_id = CAST(? AS uuid)",
                                                        examId);
                                        jdbc.update("DELETE FROM exams WHERE id = CAST(? AS uuid)", examId);
                                }
                        }
                };
        }
}
