    package com.oryfolks.certify.service;

    import com.oryfolks.certify.repository.ExamRepository;
    import com.oryfolks.certify.repository.QuestionRepository;
    import lombok.RequiredArgsConstructor;
    import org.springframework.stereotype.Service;

    import com.oryfolks.certify.dto.ExamCardResponseDTO;
    import com.oryfolks.certify.entity.Exam;
    import com.oryfolks.certify.enums.ExamStatus;

    import java.util.List;
    import com.oryfolks.certify.dto.CompetencyBandDTO;
    import com.oryfolks.certify.dto.ExamDetailsResponseDTO;
    import com.oryfolks.certify.entity.CompetencyBand;
    import com.oryfolks.certify.enums.CompetencyLevel;
    
    import java.util.UUID;

    import org.springframework.transaction.annotation.Transactional;

    import com.oryfolks.certify.dto.QuestionResponseDTO;
    import com.oryfolks.certify.entity.Question;
    import com.oryfolks.certify.exception.ResourceNotFoundException;

    @Service
    @Transactional(readOnly = true)
    @RequiredArgsConstructor
    public class ExamService {

        private final ExamRepository examRepository;

        private final QuestionRepository questionRepository;

        public List<ExamCardResponseDTO> getAvailableExams() {

            List<Exam> exams = examRepository.findAll();

            return exams.stream()
                    .filter(exam -> exam != null && (exam.getStatus() == null || exam.getStatus() == ExamStatus.ACTIVE || exam.getStatus() == ExamStatus.DRAFT || exam.getStatus() == ExamStatus.INACTIVE))
                    .map(exam -> ExamCardResponseDTO.builder()
                            .examId(exam.getId())
                            .title(exam.getTitle() != null ? exam.getTitle() : "Untitled Exam")
                            .stack(exam.getStack() != null ? exam.getStack() : "General")
                            .durationMinutes(exam.getDurationMinutes() != null ? exam.getDurationMinutes() : (exam.getDurationMin() != null ? exam.getDurationMin() : 60))
                            .perAttempt(exam.getPerAttempt() != null ? exam.getPerAttempt() : (exam.getQuestionsPerAttempt() != null ? exam.getQuestionsPerAttempt() : 25))
                            .passMark(exam.getPassMark() != null ? exam.getPassMark() : 60)
                            .version(exam.getVersion() != null ? exam.getVersion() : "1")
                            .status(exam.getStatus() != null ? exam.getStatus() : ExamStatus.ACTIVE)
                            .totalMarks(exam.getTotalMarks() != null ? exam.getTotalMarks() : 100)
                            .build())
                    .toList();
        }

        public ExamDetailsResponseDTO getExamDetails(UUID examId) {

            Exam exam = examRepository.findById(examId)
                    .orElseThrow(() -> new ResourceNotFoundException("Exam not found with id: " + examId));

            List<CompetencyBandDTO> competencyBands = exam.getCompetencyBands()
                    .stream()
                    .map(band -> CompetencyBandDTO.builder()
                            .levelName(band.getLevelName())
                            .title(band.getTitle())
                            .minScore(band.getMinScore())
                            .maxScore(band.getMaxScore())
                            .build())
                    .toList();
            return ExamDetailsResponseDTO.builder()
                    .examId(exam.getId())
                    .title(exam.getTitle())
                    .stack(exam.getStack())
                    .durationMinutes(exam.getDurationMinutes())
                    .perAttempt(exam.getPerAttempt())
                    .passMark(exam.getPassMark())
                    .version(exam.getVersion())
                    .status(exam.getStatus())
                    .competencyBands(competencyBands)
                    .totalMarks(exam.getTotalMarks() != null ? exam.getTotalMarks() : 100)
                    .build();
        }

        public List<QuestionResponseDTO> getQuestions(UUID examId) {

            // Verify exam exists
            if (!examRepository.existsById(examId)) {
                throw new ResourceNotFoundException("Exam not found with id: " + examId);
            }

            List<Question> questions = questionRepository.findByExamIdAndIsActiveTrue(examId);

            return questions.stream()
                    .map(question -> QuestionResponseDTO.builder()
                            .questionId(question.getId())
                            .questionText(question.getQuestionText())
                            .codeSnippet(question.getCodeSnippet())
                            .marks(question.getMarks())
                            .optionA(question.getOptionA())
                            .optionB(question.getOptionB())
                            .optionC(question.getOptionC())
                            .optionD(question.getOptionD())
                            .build())
                    .toList();
        }

        @Transactional
        public Exam createExam(Exam exam) {
            if (exam.getStatus() == null) {
                exam.setStatus(ExamStatus.ACTIVE);
            }
            if (exam.getCompetencyBands() == null || exam.getCompetencyBands().isEmpty()) {
                List<CompetencyBand> defaultBands = List.of(
                        CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L1).title("Expert").minScore(90).maxScore(100).build(),
                        CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L2).title("Advanced").minScore(75).maxScore(89).build(),
                        CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L3).title("Intermediate").minScore(60).maxScore(74).build(),
                        CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L4).title("Beginner").minScore(40).maxScore(59).build(),
                        CompetencyBand.builder().exam(exam).levelName(CompetencyLevel.L5).title("Needs Training").minScore(0).maxScore(39).build()
                );
                exam.setCompetencyBands(defaultBands);
            } else {
                for (CompetencyBand band : exam.getCompetencyBands()) {
                    band.setExam(exam);
                }
            }

            return examRepository.save(exam);
        }

        @Transactional
        public Question addQuestion(UUID examId, Question question) {

            Exam exam = examRepository.findById(examId)
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Exam not found with id: " + examId));

            question.setExam(exam);

            return questionRepository.save(question);
        }

        @Transactional
        public Exam updateExamStatus(
                UUID examId,
                String status) {

            Exam exam = examRepository.findById(examId)
                    .orElseThrow(() ->
                            new ResourceNotFoundException(
                                    "Exam not found with id: " + examId));

            exam.setStatus(
                    ExamStatus.valueOf(status.toUpperCase()));

            return examRepository.save(exam);
        }

    }