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
        Exam exam = examRepository.findById(req.getExamId())
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found: " + req.getExamId()));

        List<Question> questions = req.getQuestions().stream()
                .map(dto -> Question.builder()
                        .exam(exam)
                        .questionText(dto.getQuestionText())
                        .codeSnippet(dto.getCodeSnippet() != null && !dto.getCodeSnippet().isBlank()
                                ? dto.getCodeSnippet() : null)
                        .topic(dto.getTopic())
                        .type(dto.getType() != null ? dto.getType() : "MCQ")
                        .level(dto.getLevel() != null ? dto.getLevel() : "L3")
                        .difficulty(dto.getDifficulty() != null ? dto.getDifficulty() : "MEDIUM")
                        .marks(dto.getMarks() != null ? dto.getMarks() : 1)
                        .correctOption(dto.getCorrectOption())
                        .optionA(dto.getOptionA())
                        .optionB(dto.getOptionB())
                        .optionC(dto.getOptionC())
                        .optionD(dto.getOptionD())
                        .language(dto.getLanguage())
                        .sampleInput(dto.getSampleInput())
                        .sampleOutput(dto.getSampleOutput())
                        .expectedOutput(dto.getExpectedOutput())
                        .modelAnswer(dto.getModelAnswer())
                        .explanation(dto.getExplanation())
                        .isActive(true)
                        .source(dto.getSource() != null ? dto.getSource() : "AI")
                        .aiModel(dto.getAiModel() != null ? dto.getAiModel() : "Gemini-2.5-Flash")
                        .build())
                .collect(Collectors.toList());

        return questionRepository.saveAll(questions);
    }
}
