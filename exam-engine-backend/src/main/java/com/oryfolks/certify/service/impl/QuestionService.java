package com.oryfolks.certify.service.impl;


import com.oryfolks.certify.dto.GenerateQuestionRequest;
import com.oryfolks.certify.dto.GeneratedQuestionDTO;
import com.oryfolks.certify.dto.SaveGeneratedQuestionsRequest;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.exception.ResourceNotFoundException;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import com.oryfolks.certify.service.QuestionDuplicateDetectionService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * QuestionService — saves AI-generated questions into the Question table,
 * reusing the existing QuestionRepository. Also provides the regenerate
 * delegate to GeminiService.
 */
@Service
@RequiredArgsConstructor
public class QuestionService {

    private static final Logger log = LoggerFactory.getLogger(QuestionService.class);

    private final QuestionRepository questionRepository;
    private final ExamRepository examRepository;
    private final GeminiService geminiService;
    private final QuestionDuplicateDetectionService duplicateDetectionService;

    public static class UniqueQuestionList extends ArrayList<GeneratedQuestionDTO> {
        private final int duplicatesRemoved;

        public UniqueQuestionList(List<GeneratedQuestionDTO> list, int duplicatesRemoved) {
            super(list);
            this.duplicatesRemoved = duplicatesRemoved;
        }

        public int getDuplicatesRemoved() {
            return duplicatesRemoved;
        }
    }

    /** Generate questions via Gemini (no DB write) with duplicate detection and replacement generation. */
    public List<GeneratedQuestionDTO> generateQuestions(GenerateQuestionRequest req) {
        int targetCount = req.getCount() != null ? req.getCount() : 10;
        String stack = req.getStack() != null ? req.getStack() : "Java";

        // Load existing normalized question texts for this tech stack
        Set<String> existingNormalizedTexts = duplicateDetectionService.getExistingNormalizedTexts(stack);

        // Generate initial batch
        List<GeneratedQuestionDTO> initialBatch = geminiService.generate(req);

        // Filter duplicates in the initial batch
        QuestionDuplicateDetectionService.DuplicateFilterResult filterResult =
                duplicateDetectionService.filterDuplicates(initialBatch, stack, existingNormalizedTexts);

        List<GeneratedQuestionDTO> uniqueQuestions = new ArrayList<>(filterResult.getUniqueQuestions());
        int totalDuplicatesRemoved = filterResult.getDuplicatesRemoved();

        int attempts = 0;
        int maxAttempts = 5;

        // Loop to generate replacements for any filtered duplicates
        while (uniqueQuestions.size() < targetCount && attempts < maxAttempts) {
            attempts++;
            int shortage = targetCount - uniqueQuestions.size();
            log.info("Shortage of {} questions detected due to duplicate filtering. Generating replacement batch (attempt {}/{})...",
                    shortage, attempts, maxAttempts);

            GenerateQuestionRequest replacementReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack())
                    .level(req.getLevel())
                    .difficulty(req.getDifficulty())
                    .type(req.getType())
                    .count(shortage)
                    .topic(req.getTopic())
                    .examId(req.getExamId())
                    .difficultyMode(req.getDifficultyMode())
                    .beginnerPct(req.getBeginnerPct())
                    .intermediatePct(req.getIntermediatePct())
                    .advancedPct(req.getAdvancedPct())
                    .build();

            List<GeneratedQuestionDTO> replacementBatch = geminiService.generate(replacementReq);

            QuestionDuplicateDetectionService.DuplicateFilterResult replacementFilterResult =
                    duplicateDetectionService.filterDuplicates(replacementBatch, stack, existingNormalizedTexts);

            uniqueQuestions.addAll(replacementFilterResult.getUniqueQuestions());
            totalDuplicatesRemoved += replacementFilterResult.getDuplicatesRemoved();
        }

        log.info("Finished question generation. Total unique generated questions: {}. Total duplicates removed: {}.",
                uniqueQuestions.size(), totalDuplicatesRemoved);

        return new UniqueQuestionList(uniqueQuestions, totalDuplicatesRemoved);
    }

    /** Re-generate a single question via Gemini (no DB write). */
    public GeneratedQuestionDTO regenerateQuestion(GeneratedQuestionDTO original) {
        return geminiService.regenerate(original);
    }

    /** Persist the approved/edited AI-generated questions to the DB, filtering any final duplicates. */
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

        // Fetch existing normalized questions to filter out any late duplicates
        String techStack = req.getQuestions().stream()
                .map(GeneratedQuestionDTO::getStack)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(finalExam != null ? finalExam.getStack() : "Java");
        Set<String> existingNormalizedTexts = duplicateDetectionService.getExistingNormalizedTexts(techStack);

        List<Question> questions = req.getQuestions().stream()
                .filter(dto -> {
                    String norm = duplicateDetectionService.normalize(dto.getQuestionText());
                    if (existingNormalizedTexts.contains(norm)) {
                        log.warn("Filtering out duplicate question text during save persistence: {}", dto.getQuestionText());
                        return false;
                    }
                    existingNormalizedTexts.add(norm); // prevent duplicates within save payload
                    return true;
                })
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
