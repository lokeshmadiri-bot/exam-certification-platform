package com.oryfolks.certify.service;

import com.oryfolks.certify.dto.GeneratedQuestionDTO;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionDuplicateDetectionService {

    private final QuestionRepository questionRepository;

    /**
     * Normalizes question text by trimming, converting to lowercase, and collapsing multiple spaces.
     */
    public String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    /**
     * Filters out duplicates from a list of generated questions against existing questions and within the batch.
     * Returns a wrapper with unique questions and count of duplicates removed.
     */
    public DuplicateFilterResult filterDuplicates(List<GeneratedQuestionDTO> newQuestions, String stack, Set<String> existingNormalizedTexts) {
        List<GeneratedQuestionDTO> uniqueBatch = new ArrayList<>();
        int duplicatesCount = 0;

        for (GeneratedQuestionDTO q : newQuestions) {
            String norm = normalize(q.getQuestionText());
            if (norm.isEmpty()) {
                duplicatesCount++;
                continue;
            }
            if (existingNormalizedTexts.contains(norm)) {
                duplicatesCount++;
                log.info("Detected duplicate of existing question in tech stack '{}': {}", stack, q.getQuestionText());
            } else {
                // Check within the newly added unique items
                boolean isBatchDuplicate = false;
                for (GeneratedQuestionDTO uniq : uniqueBatch) {
                    if (normalize(uniq.getQuestionText()).equals(norm)) {
                        isBatchDuplicate = true;
                        break;
                    }
                }
                if (isBatchDuplicate) {
                    duplicatesCount++;
                    log.info("Detected duplicate within current generated batch: {}", q.getQuestionText());
                } else {
                    uniqueBatch.add(q);
                    existingNormalizedTexts.add(norm); // add to existing so subsequent items check against it
                }
            }
        }

        return new DuplicateFilterResult(uniqueBatch, duplicatesCount);
    }

    /**
     * Helper to load all existing normalized question texts for a tech stack.
     */
    public Set<String> getExistingNormalizedTexts(String stack) {
        if (stack == null || stack.isBlank()) {
            return new HashSet<>();
        }
        List<Question> existing = questionRepository.findByStackIgnoreCase(stack.trim());
        return existing.stream()
                .map(q -> normalize(q.getQuestionText()))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(HashSet::new));
    }

    public static class DuplicateFilterResult {
        private final List<GeneratedQuestionDTO> uniqueQuestions;
        private final int duplicatesRemoved;

        public DuplicateFilterResult(List<GeneratedQuestionDTO> uniqueQuestions, int duplicatesRemoved) {
            this.uniqueQuestions = uniqueQuestions;
            this.duplicatesRemoved = duplicatesRemoved;
        }

        public List<GeneratedQuestionDTO> getUniqueQuestions() {
            return uniqueQuestions;
        }

        public int getDuplicatesRemoved() {
            return duplicatesRemoved;
        }
    }
}
