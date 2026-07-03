package com.oryfolks.certify;

import com.oryfolks.certify.enums.UserRole;
import com.oryfolks.certify.enums.ExamStatus;
import com.oryfolks.certify.enums.CompetencyLevel;
import com.oryfolks.certify.entity.User;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@SpringBootApplication
public class CertifyApplication {

        public static void main(String[] args) {
                SpringApplication.run(CertifyApplication.class, args);
        }

        @Bean
        public CommandLineRunner initDatabase(UserRepository userRepository, ExamRepository examRepository,
                        QuestionRepository questionRepository, PasswordEncoder passwordEncoder) {
                return args -> {
                        // 1. Seed Users
                        if (userRepository.findByUsername("aarav").isEmpty()) {
                                userRepository.save(User.builder()
                                                .username("aarav")
                                                .password(passwordEncoder.encode("password123"))
                                                .role(UserRole.ROLE_ADMIN)
                                                .fullName("Aarav Mehta")
                                                .title("QA Automation Engineer")
                                                .build());
                        }

                        if (userRepository.findByUsername("ravi").isEmpty()) {
                                userRepository.save(User.builder()
                                                .username("ravi")
                                                .password(passwordEncoder.encode("password123"))
                                                .role(UserRole.ROLE_CANDIDATE)
                                                .fullName("Ravi Khanna")
                                                .title("L&D Administrator")
                                                .build());
                        }

                        // 2. Seed Default Exams and Questions if library is empty
                        if (examRepository.count() == 0) {
                                // Selenium Exam
                                Exam selenium = Exam.builder()
                                                .title("Selenium Certification")
                                                .stack("selenium")
                                                .durationMinutes(45)
                                                .questionPool(120)
                                                .perAttempt(30)
                                                .passMark(60)
                                                .version("v4")
                                                .status(ExamStatus.ACTIVE)
                                                .build();

                                // Build bands
                                List<CompetencyBand> bands = List.of(
                                                CompetencyBand.builder().exam(selenium).levelName(CompetencyLevel.L1)
                                                                .title("Expert")
                                                                .minScore(90).maxScore(100).build(),
                                                CompetencyBand.builder().exam(selenium).levelName(CompetencyLevel.L2)
                                                                .title("Advanced").minScore(75).maxScore(89).build(),
                                                CompetencyBand.builder().exam(selenium).levelName(CompetencyLevel.L3)
                                                                .title("Intermediate").minScore(60).maxScore(74)
                                                                .build(),
                                                CompetencyBand.builder().exam(selenium).levelName(CompetencyLevel.L4)
                                                                .title("Beginner").minScore(40).maxScore(59).build(),
                                                CompetencyBand.builder().exam(selenium).levelName(CompetencyLevel.L5)
                                                                .title("Needs Training").minScore(0).maxScore(39)
                                                                .build());
                                selenium.setCompetencyBands(bands);
                                examRepository.save(selenium);

                                // Seed some default questions
                                questionRepository.save(Question.builder()
                                                .exam(selenium)
                                                .questionText("Which wait strategy should you use when an element's presence is conditional and you want to poll until it appears, without failing immediately?")
                                                .codeSnippet("WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));\nwait.until(ExpectedConditions.________( By.id(\"results\") ));")
                                                .difficulty("MEDIUM")
                                                .marks(2)
                                                .correctOption("B")
                                                .optionA("Thread.sleep(10000) before locating the element")
                                                .optionB("presenceOfElementLocated — an explicit wait condition")
                                                .optionC("implicitlyWait set globally on the driver")
                                                .optionD("A fixed polling loop with a custom counter")
                                                .build());

                                questionRepository.save(Question.builder()
                                                .exam(selenium)
                                                .questionText("Difference between explicit, implicit and fluent waits in Selenium")
                                                .difficulty("HARD")
                                                .marks(2)
                                                .correctOption("A")
                                                .optionA("Explicit polls for condition, Fluent allows polling frequency tuning, Implicit sets static timeout")
                                                .optionB("Explicit and implicit are same, fluent is deprecated")
                                                .optionC("Fluent is faster because it uses multi-threading")
                                                .optionD("Implicit wait is recommended for conditional AJAX elements")
                                                .build());

                                // Seed API testing exam
                                Exam apiExam = Exam.builder()
                                                .title("API Testing")
                                                .stack("api")
                                                .durationMinutes(45)
                                                .questionPool(90)
                                                .perAttempt(30)
                                                .passMark(60)
                                                .version("v3")
                                                .status(ExamStatus.ACTIVE)
                                                .build();

                                List<CompetencyBand> apiBands = List.of(
                                                CompetencyBand.builder().exam(apiExam).levelName(CompetencyLevel.L1)
                                                                .title("Expert")
                                                                .minScore(90).maxScore(100).build(),
                                                CompetencyBand.builder().exam(apiExam).levelName(CompetencyLevel.L2)
                                                                .title("Advanced")
                                                                .minScore(75).maxScore(89).build(),
                                                CompetencyBand.builder().exam(apiExam).levelName(CompetencyLevel.L3)
                                                                .title("Intermediate").minScore(60).maxScore(74)
                                                                .build(),
                                                CompetencyBand.builder().exam(apiExam).levelName(CompetencyLevel.L4)
                                                                .title("Beginner")
                                                                .minScore(40).maxScore(59).build(),
                                                CompetencyBand.builder().exam(apiExam).levelName(CompetencyLevel.L5)
                                                                .title("Needs Training").minScore(0).maxScore(39)
                                                                .build());
                                apiExam.setCompetencyBands(apiBands);
                                examRepository.save(apiExam);

                                // Seed DevOps exam
                                Exam devops = Exam.builder()
                                                .title("DevOps")
                                                .stack("devops")
                                                .durationMinutes(45)
                                                .questionPool(80)
                                                .perAttempt(30)
                                                .passMark(60)
                                                .version("v2")
                                                .status(ExamStatus.ACTIVE)
                                                .build();
                                devops.setCompetencyBands(List.of(
                                                CompetencyBand.builder().exam(devops).levelName(CompetencyLevel.L1)
                                                                .title("Expert")
                                                                .minScore(90).maxScore(100).build(),
                                                CompetencyBand.builder().exam(devops).levelName(CompetencyLevel.L2)
                                                                .title("Advanced")
                                                                .minScore(75).maxScore(89).build(),
                                                CompetencyBand.builder().exam(devops).levelName(CompetencyLevel.L3)
                                                                .title("Intermediate").minScore(60).maxScore(74)
                                                                .build(),
                                                CompetencyBand.builder().exam(devops).levelName(CompetencyLevel.L4)
                                                                .title("Beginner")
                                                                .minScore(40).maxScore(59).build(),
                                                CompetencyBand.builder().exam(devops).levelName(CompetencyLevel.L5)
                                                                .title("Needs Training").minScore(0).maxScore(39)
                                                                .build()));
                                examRepository.save(devops);
                        }
                };
        }
}
