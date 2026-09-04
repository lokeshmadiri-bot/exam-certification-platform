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

                        // Create 8 more default users (Candidates/Admins)
                        String[][] extraUsers = {
                            {"pavan", "Pavan Kumar", "Software Engineer", "ROLE_CANDIDATE"},
                            {"yasaswini", "Yasaswini Y.", "QA Analyst", "ROLE_CANDIDATE"},
                            {"karthik", "Karthik Raja", "Frontend Developer", "ROLE_CANDIDATE"},
                            {"priya", "Priya Sharma", "HR Executive", "ROLE_CANDIDATE"},
                            {"anil", "Anil Verma", "DevOps Engineer", "ROLE_CANDIDATE"},
                            {"deepa", "Deepa Nair", "Project Manager", "ROLE_CANDIDATE"},
                            {"suresh", "Suresh Raina", "Database Administrator", "ROLE_CANDIDATE"},
                            {"neha", "Neha Gupta", "Security Analyst", "ROLE_CANDIDATE"}
                        };
                        for (String[] uInfo : extraUsers) {
                            String uname = uInfo[0];
                            String fname = uInfo[1];
                            String title = uInfo[2];
                            UserRole role = UserRole.valueOf(uInfo[3]);
                            java.util.Optional<User> uOpt = userRepository.findByUsername(uname);
                            if (uOpt.isEmpty()) {
                                userRepository.save(User.builder()
                                        .username(uname)
                                        .password(passwordEncoder.encode("password123"))
                                        .role(role)
                                        .fullName(fname)
                                        .title(title)
                                        .build());
                            } else {
                                User u = uOpt.get();
                                u.setPassword(passwordEncoder.encode("password123"));
                                u.setRole(role);
                                u.setFullName(fname);
                                u.setTitle(title);
                                userRepository.save(u);
                            }
                        }


                        // 2. Remove seeded dummy exams — only show active exams in library.
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

                        // 3. Ensure default active certification exams exist if database has no active exams
                        if (examRepository.count() == 0) {
                                com.oryfolks.certify.entity.Exam javaExam = com.oryfolks.certify.entity.Exam.builder()
                                                .id(java.util.UUID.randomUUID())
                                                .title("Java Full Stack Certification")
                                                .stack("Java")
                                                .durationMinutes(60)
                                                .questionPool(25)
                                                .perAttempt(25)
                                                .passMark(60)
                                                .totalMarks(100)
                                                .version("1")
                                                .status(com.oryfolks.certify.enums.ExamStatus.ACTIVE)
                                                .difficultyMode("NONE")
                                                .instructions("Ensure stable internet connection and webcam access during the examination.")
                                                .build();
                                examRepository.save(javaExam);

                                com.oryfolks.certify.entity.Exam reactExam = com.oryfolks.certify.entity.Exam.builder()
                                                .id(java.util.UUID.randomUUID())
                                                .title("React.js Frontend Certification")
                                                .stack("React")
                                                .durationMinutes(45)
                                                .questionPool(20)
                                                .perAttempt(20)
                                                .passMark(60)
                                                .totalMarks(100)
                                                .version("1")
                                                .status(com.oryfolks.certify.enums.ExamStatus.ACTIVE)
                                                .difficultyMode("NONE")
                                                .instructions("Frontend proctored examination covering React fundamentals, hooks, and state management.")
                                                .build();
                                examRepository.save(reactExam);

                                com.oryfolks.certify.entity.Exam pythonExam = com.oryfolks.certify.entity.Exam.builder()
                                                .id(java.util.UUID.randomUUID())
                                                .title("Python Backend Engineering")
                                                .stack("Python")
                                                .durationMinutes(50)
                                                .questionPool(20)
                                                .perAttempt(20)
                                                .passMark(60)
                                                .totalMarks(100)
                                                .version("1")
                                                .status(com.oryfolks.certify.enums.ExamStatus.ACTIVE)
                                                .difficultyMode("NONE")
                                                .instructions("Proctored assessment covering Python syntax, data structures, OOP, and backend services.")
                                                .build();
                                examRepository.save(pythonExam);
                        }
                };
        }
}
