package com.oryfolks.certify.service.impl;


import com.oryfolks.certify.dto.GenerateQuestionRequest;
import com.oryfolks.certify.dto.GeneratedQuestionDTO;
import com.oryfolks.certify.dto.SaveGeneratedQuestionsRequest;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * QuestionService — saves AI-generated questions into the Question table,
 * reusing the existing QuestionRepository. Also provides the regenerate
 * delegate to GeminiService.
 */
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final GeminiService geminiService;

    /** Generate questions via Gemini (no DB write). */
    public List<GeneratedQuestionDTO> generateQuestions(GenerateQuestionRequest req) {
        return geminiService.generate(req);
    }

    /** Re-generate a single question via Gemini (no DB write). */
    public GeneratedQuestionDTO regenerateQuestion(GeneratedQuestionDTO original) {
        return geminiService.regenerate(original);
    }

    /** Persist the approved/edited AI-generated questions to the DB. */
    @Transactional
    public List<Question> saveGeneratedQuestions(SaveGeneratedQuestionsRequest req) {
        if (req == null || req.getQuestions() == null || req.getQuestions().isEmpty()) {
            return List.of();
        }

        Exam exam = null;
        if (req.getExamId() != null && examRepository != null) {
            try {
                exam = examRepository.findById(req.getExamId()).orElse(null);
            } catch (Exception ignored) {}
        }
        if (exam == null && examRepository != null) {
            try {
                List<Exam> allExams = examRepository.findAll();
                if (!allExams.isEmpty()) {
                    exam = allExams.get(0);
                }
            } catch (Exception ignored) {}
        }

        Exam finalExam = exam;
        List<Question> questions = req.getQuestions().stream()
                .map(dto -> {
                    String rawOpt = dto.getCorrectOption();
                    String cleanOpt = "A";
                    if (rawOpt != null && !rawOpt.isBlank()) {
                        String trimmed = rawOpt.trim().toUpperCase();
                        if (trimmed.startsWith("A")) cleanOpt = "A";
                        else if (trimmed.startsWith("B")) cleanOpt = "B";
                        else if (trimmed.startsWith("C")) cleanOpt = "C";
                        else if (trimmed.startsWith("D")) cleanOpt = "D";
                        else cleanOpt = trimmed.substring(0, 1);
                    }

                    String stack = (dto.getStack() != null && !dto.getStack().isBlank()) 
                            ? dto.getStack() 
                            : (finalExam != null && finalExam.getStack() != null ? finalExam.getStack() : "Java");
                    String qText = (dto.getQuestionText() != null && !dto.getQuestionText().isBlank())
                            ? dto.getQuestionText()
                            : "Generated AI Question";
                    String diff = (dto.getDifficulty() != null && !dto.getDifficulty().isBlank())
                            ? dto.getDifficulty().trim().toUpperCase()
                            : "MEDIUM";
                    String lvl = (dto.getLevel() != null && !dto.getLevel().isBlank())
                            ? dto.getLevel().trim().toUpperCase()
                            : "L3";
                    String type = (dto.getType() != null && !dto.getType().isBlank())
                            ? dto.getType().trim().toUpperCase()
                            : "MCQ";
                    int marks = (dto.getMarks() != null && dto.getMarks() > 0) ? dto.getMarks() : 1;

                    String optA = (dto.getOptionA() != null && !dto.getOptionA().isBlank()) ? dto.getOptionA() : "Option A";
                    String optB = (dto.getOptionB() != null && !dto.getOptionB().isBlank()) ? dto.getOptionB() : "Option B";
                    String optC = (dto.getOptionC() != null && !dto.getOptionC().isBlank()) ? dto.getOptionC() : "Option C";
                    String optD = (dto.getOptionD() != null && !dto.getOptionD().isBlank()) ? dto.getOptionD() : "Option D";

                    return Question.builder()
                            .exam(finalExam)
                            .stack(stack)
                            .questionText(qText)
                            .codeSnippet(dto.getCodeSnippet() != null && !dto.getCodeSnippet().isBlank() ? dto.getCodeSnippet() : null)
                            .topic(dto.getTopic() != null && !dto.getTopic().isBlank() ? dto.getTopic() : stack)
                            .type(type)
                            .level(lvl)
                            .difficulty(diff)
                            .marks(marks)
                            .correctOption(cleanOpt)
                            .optionA(optA)
                            .optionB(optB)
                            .optionC(optC)
                            .optionD(optD)
                            .language(dto.getLanguage())
                            .sampleInput(dto.getSampleInput())
                            .sampleOutput(dto.getSampleOutput())
                            .expectedOutput(dto.getExpectedOutput())
                            .modelAnswer(dto.getModelAnswer())
                            .explanation(dto.getExplanation())
                            .isActive(true)
                            .status("ACTIVE")
                            .source(dto.getSource() != null && !dto.getSource().isBlank() ? dto.getSource() : "AI")
                            .aiModel(dto.getAiModel() != null && !dto.getAiModel().isBlank() ? dto.getAiModel() : "Gemini-2.5-Flash")
                            .build();
                })
                .collect(Collectors.toList());

        return questionRepository.saveAll(questions);
    }
}
