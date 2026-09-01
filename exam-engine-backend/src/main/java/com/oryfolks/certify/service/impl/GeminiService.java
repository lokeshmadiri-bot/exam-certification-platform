package com.oryfolks.certify.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oryfolks.certify.dto.GenerateQuestionRequest;
import com.oryfolks.certify.dto.GeneratedQuestionDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * GeminiService — AI question generator supporting Groq Cloud (gsk_...),
 * Grok (xAI), and Google Gemini API, with fallback to local question
 * generation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Value("${grok.api.key:}")
    private String grokApiKey;

    @Value("${grok.api.url:https://api.x.ai/v1/chat/completions}")
    private String grokApiUrl;

    @Value("${grok.api.model:grok-2-latest}")
    private String grokModel;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String geminiApiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /** Generate N questions using Groq Cloud, Grok, Gemini, or local fallback. */
    public List<GeneratedQuestionDTO> generate(GenerateQuestionRequest req) {
        // If difficulty is null/blank or NONE: use 50% Easy, 30% Medium, 20% Hard distribution
        if (req.getDifficulty() == null || req.getDifficulty().isBlank() || "NONE".equalsIgnoreCase(req.getDifficulty())) {
            return generateWithDistribution(req);
        }

        if ("MANUAL".equalsIgnoreCase(req.getDifficulty()) || "MANUAL".equalsIgnoreCase(req.getDifficultyMode())) {
            return generateWithManualDistribution(req);
        }

        String defaultGroqKey = "";
        String groqKey = (groqApiKey != null && !groqApiKey.trim().isBlank()) ? groqApiKey.trim() : defaultGroqKey;
        if (groqKey.isBlank() && grokApiKey != null && grokApiKey.trim().startsWith("gsk_")) {
            groqKey = grokApiKey.trim();
        }

        if (!groqKey.isBlank()) {
            log.info("Generating questions using Groq Cloud AI API (model: {})...", groqModel);
            return generateWithOpenAiFormat(req, groqKey, groqApiUrl, groqModel, "Groq");
        }

        String grokKey = (grokApiKey != null) ? grokApiKey.trim() : "";
        if (!grokKey.isBlank()) {
            log.info("Generating questions using Grok AI API (model: {})...", grokModel);
            return generateWithOpenAiFormat(req, grokKey, grokApiUrl, grokModel, "Grok");
        }

        String geminiKey = (geminiApiKey != null) ? geminiApiKey.trim() : "";
        if (!geminiKey.isBlank()) {
            log.info("Generating questions using Gemini AI API...");
            return generateWithGemini(req, geminiKey);
        }

        log.warn("No GROQ_API_KEY, GROK_API_KEY, or GEMINI_API_KEY configured. Using local question fallback.");
        return generateLocalFallback(req);
    }

    /**
     * Generate with 50% Easy / 30% Medium / 20% Hard distribution.
     * Allocates counts using integer floor and assigns remainder to Easy
     * to guarantee exactly req.count total questions.
     */
    private List<GeneratedQuestionDTO> generateWithDistribution(GenerateQuestionRequest req) {
        int total = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 10;

        int easyCount  = (int) Math.floor(total * 0.50);
        int mediumCount = (int) Math.floor(total * 0.30);
        int hardCount  = (int) Math.floor(total * 0.20);

        // Assign any remainder to Easy to guarantee exact total
        int remainder = total - easyCount - mediumCount - hardCount;
        easyCount += remainder;

        log.info("Auto-distributing {} questions: {} Easy, {} Medium, {} Hard", total, easyCount, mediumCount, hardCount);

        List<GeneratedQuestionDTO> all = new ArrayList<>();

        if (easyCount > 0) {
            GenerateQuestionRequest easyReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("EASY").type(req.getType())
                    .count(easyCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(easyReq));
        }
        if (mediumCount > 0) {
            try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
            GenerateQuestionRequest medReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("MEDIUM").type(req.getType())
                    .count(mediumCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(medReq));
        }
        if (hardCount > 0) {
            try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
            GenerateQuestionRequest hardReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("HARD").type(req.getType())
                    .count(hardCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(hardReq));
        }

        // Validate distribution and fix any incorrectly tagged questions
        all = enforceDistribution(all, easyCount, mediumCount, hardCount);

        log.info("Distribution result: {} Easy, {} Medium, {} Hard",
                all.stream().filter(q -> "EASY".equalsIgnoreCase(q.getDifficulty())).count(),
                all.stream().filter(q -> "MEDIUM".equalsIgnoreCase(q.getDifficulty())).count(),
                all.stream().filter(q -> "HARD".equalsIgnoreCase(q.getDifficulty())).count());
        return all;
    }

    /** Generate questions using user-specified manual percentage distribution. */
    private List<GeneratedQuestionDTO> generateWithManualDistribution(GenerateQuestionRequest req) {
        int total = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 10;

        int bPct = req.getBeginnerPct() != null ? req.getBeginnerPct() : 40;
        int iPct = req.getIntermediatePct() != null ? req.getIntermediatePct() : 40;
        int aPct = req.getAdvancedPct() != null ? req.getAdvancedPct() : 20;

        com.oryfolks.certify.util.DifficultyCalculator.DifficultyCounts counts = 
                com.oryfolks.certify.util.DifficultyCalculator.calculateCounts(total, bPct, iPct, aPct);

        int easyCount = counts.getBeginner();
        int mediumCount = counts.getIntermediate();
        int hardCount = counts.getAdvanced();

        log.info("Manual-distributing {} questions: {} Easy, {} Medium, {} Hard (distribution: {}% / {}% / {}%)", 
            total, easyCount, mediumCount, hardCount, bPct, iPct, aPct);

        List<GeneratedQuestionDTO> all = new ArrayList<>();

        if (easyCount > 0) {
            GenerateQuestionRequest easyReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("EASY").type(req.getType())
                    .count(easyCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(easyReq));
        }
        if (mediumCount > 0) {
            try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
            GenerateQuestionRequest medReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("MEDIUM").type(req.getType())
                    .count(mediumCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(medReq));
        }
        if (hardCount > 0) {
            try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
            GenerateQuestionRequest hardReq = GenerateQuestionRequest.builder()
                    .stack(req.getStack()).level(req.getLevel())
                    .difficulty("HARD").type(req.getType())
                    .count(hardCount).topic(req.getTopic()).examId(req.getExamId())
                    .build();
            all.addAll(generateSingle(hardReq));
        }

        // Validate distribution and fix any tags if AI returned wrong labels
        all = enforceDistribution(all, easyCount, mediumCount, hardCount);

        return all;
    }

    /** Delegate to the correct AI provider for a single-difficulty request. */
    private List<GeneratedQuestionDTO> generateSingle(GenerateQuestionRequest req) {
        String defaultGroqKey = "";
        String groqKey = (groqApiKey != null && !groqApiKey.trim().isBlank()) ? groqApiKey.trim() : defaultGroqKey;
        if (groqKey.isBlank() && grokApiKey != null && grokApiKey.trim().startsWith("gsk_")) {
            groqKey = grokApiKey.trim();
        }
        if (!groqKey.isBlank()) return generateWithOpenAiFormat(req, groqKey, groqApiUrl, groqModel, "Groq");
        String grokKey = (grokApiKey != null) ? grokApiKey.trim() : "";
        if (!grokKey.isBlank()) return generateWithOpenAiFormat(req, grokKey, grokApiUrl, grokModel, "Grok");
        String geminiKey = (geminiApiKey != null) ? geminiApiKey.trim() : "";
        if (!geminiKey.isBlank()) return generateWithGemini(req, geminiKey);
        return generateLocalFallback(req);
    }

    /**
     * Validates distribution after generation and force-corrects difficulty tags
     * if AI returned incorrect labels (ensuring stored data is always accurate).
     */
    private List<GeneratedQuestionDTO> enforceDistribution(
            List<GeneratedQuestionDTO> questions, int expectedEasy, int expectedMedium, int expectedHard) {
        List<GeneratedQuestionDTO> result = new ArrayList<>(questions);
        // Reassign the first N questions per difficulty bucket in order (Easy -> Medium -> Hard)
        // Only applies if AI returned wrong tags; normally questions already have correct tags.
        int easyAssigned = 0, medAssigned = 0, hardAssigned = 0;
        for (int i = 0; i < result.size(); i++) {
            GeneratedQuestionDTO q = result.get(i);
            String currentDiff = q.getDifficulty() != null ? q.getDifficulty().toUpperCase() : "";
            if ("EASY".equals(currentDiff) && easyAssigned < expectedEasy) {
                easyAssigned++;
            } else if ("MEDIUM".equals(currentDiff) && medAssigned < expectedMedium) {
                medAssigned++;
            } else if ("HARD".equals(currentDiff) && hardAssigned < expectedHard) {
                hardAssigned++;
            } else {
                // Fix: assign based on remaining quotas
                if (easyAssigned < expectedEasy) {
                    result.set(i, withDifficulty(q, "EASY", 1)); easyAssigned++;
                } else if (medAssigned < expectedMedium) {
                    result.set(i, withDifficulty(q, "MEDIUM", 2)); medAssigned++;
                } else {
                    result.set(i, withDifficulty(q, "HARD", 3)); hardAssigned++;
                }
            }
        }
        return result;
    }

    private GeneratedQuestionDTO withDifficulty(GeneratedQuestionDTO q, String diff, int marks) {
        return GeneratedQuestionDTO.builder()
                .tempId(q.getTempId()).questionText(q.getQuestionText()).codeSnippet(q.getCodeSnippet())
                .stack(q.getStack()).type(q.getType()).level(q.getLevel())
                .difficulty(diff).marks(marks)
                .optionA(q.getOptionA()).optionB(q.getOptionB()).optionC(q.getOptionC()).optionD(q.getOptionD())
                .correctOption(q.getCorrectOption()).source(q.getSource()).aiModel(q.getAiModel())
                .examId(q.getExamId()).build();
    }

    private List<GeneratedQuestionDTO> generateWithOpenAiFormat(GenerateQuestionRequest req, String key,
            String endpointUrl, String model, String providerName) {
        String prompt = buildPrompt(req);
        String selectedModel = (model != null && !model.isBlank()) ? model : "groq/compound-mini";

        Map<String, Object> requestBody = Map.of(
                "model", selectedModel,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are an expert technical exam question author. Respond ONLY with a valid JSON array."),
                        Map.of("role", "user", "content", prompt)),
                "temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(key);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(endpointUrl, entity, String.class);
            return parseOpenAiResponse(response.getBody(), req, providerName + " (" + selectedModel + ")");
        } catch (Exception e) {
            String errStr = e.getMessage() != null ? e.getMessage() : "";
            if (errStr.contains("429") || errStr.contains("Too Many Requests") || errStr.contains("Rate limit")) {
                log.warn("Rate limit (429) hit. Waiting 2.5 seconds before retrying...");
                try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
                try {
                    ResponseEntity<String> response = restTemplate.postForEntity(endpointUrl, entity, String.class);
                    return parseOpenAiResponse(response.getBody(), req, providerName + " (" + selectedModel + ")");
                } catch (Exception retryEx) {
                    log.error("Retry after 429 also failed: {}", retryEx.getMessage());
                }
            }
            log.warn("{} API call failed ({}), falling back to local question generator.", providerName,
                    e.getMessage());
            return generateLocalFallback(req);
        }
    }

    private List<GeneratedQuestionDTO> generateWithGemini(GenerateQuestionRequest req, String key) {
        String prompt = buildPrompt(req);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 4096,
                        "responseMimeType", "application/json"));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        String urlWithKey = geminiApiUrl + "?key=" + key;

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
            return parseGeminiResponse(response.getBody(), req);
        } catch (Exception e) {
            String errStr = e.getMessage() != null ? e.getMessage() : "";
            if (errStr.contains("429") || errStr.contains("Too Many Requests") || errStr.contains("Rate limit")) {
                log.warn("Gemini Rate limit (429) hit. Waiting 2.5 seconds before retrying...");
                try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
                try {
                    ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
                    return parseGeminiResponse(response.getBody(), req);
                } catch (Exception retryEx) {
                    log.error("Gemini retry after 429 also failed: {}", retryEx.getMessage());
                }
            }
            log.warn("Gemini API call failed ({}), generating local question fallback.", e.getMessage());
            return generateLocalFallback(req);
        }
    }

    private List<GeneratedQuestionDTO> generateLocalFallback(GenerateQuestionRequest req) {
        int count = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 10;
        String stack = req.getStack() != null ? req.getStack() : "Java";
        String level = req.getLevel() != null ? req.getLevel() : "L3";
        String difficulty = (req.getDifficulty() != null && !req.getDifficulty().isBlank())
                ? req.getDifficulty() : "MEDIUM";
        String type = req.getType() != null ? req.getType() : "MCQ";
        int marks = "HARD".equalsIgnoreCase(difficulty) ? 3 : ("MEDIUM".equalsIgnoreCase(difficulty) ? 2 : 1);

        List<GeneratedQuestionDTO> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(GeneratedQuestionDTO.builder()
                    .tempId("gen-" + i + "-" + System.currentTimeMillis())
                    .questionText(String.format("What is the primary function of %s concept #%d in %s development?",
                            stack, i + 1, type))
                    .codeSnippet("CODING".equalsIgnoreCase(type) ? String.format(
                            "// Sample %s code snippet\npublic class Demo {\n  public static void main(String[] args) {\n    System.out.println(\"Test %d\");\n  }\n}",
                            stack, i + 1) : "")
                    .stack(stack)
                    .type(type)
                    .level(level)
                    .difficulty(difficulty)
                    .marks(marks)
                    .optionA(String.format("Optimizes memory allocation and execution speed for %s", stack))
                    .optionB("Provides thread-safe access across concurrent threads")
                    .optionC("Handles unhandled exceptions in asynchronous operations")
                    .optionD("Enforces static type checking at compile time")
                    .correctOption("A")
                    .source("AI_FALLBACK")
                    .aiModel("Local-Fallback")
                    .examId(req.getExamId())
                    .build());
        }
        return list;
    }

    /** Regenerate a single question. */
    public GeneratedQuestionDTO regenerate(GeneratedQuestionDTO original) {
        GenerateQuestionRequest req = GenerateQuestionRequest.builder()
                .stack(original.getStack())
                .level(original.getLevel())
                .difficulty(original.getDifficulty())
                .type(original.getType())
                .count(1)
                .examId(original.getExamId())
                .build();
        List<GeneratedQuestionDTO> results = generate(req);
        return results.isEmpty() ? original : results.get(0);
    }

    private String buildPrompt(GenerateQuestionRequest req) {
        int count = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 10;
        String difficulty = (req.getDifficulty() != null && !req.getDifficulty().isBlank())
                ? req.getDifficulty() : "MEDIUM";
        String topicClause = (req.getTopic() != null && !req.getTopic().isBlank())
                ? "Topic guidance: " + req.getTopic() + ". "
                : "";

        return """
                You are an expert technical exam question writer for a software engineering certification platform.

                Generate exactly %d multiple-choice question(s) with the following requirements:
                - Technology Stack: %s
                - Difficulty Level: %s (L1=Beginner, L2=Elementary, L3=Intermediate, L4=Advanced, L5=Expert)
                - Difficulty Tag: %s (EASY, MEDIUM, HARD)
                - Question Type: %s
                - %s

                Rules:
                1. Each question must have exactly 4 options (A, B, C, D).
                2. Only one option is correct.
                3. Options must be realistic and plausible (no trick options).
                4. For CODING type, include a short code snippet in the codeSnippet field (or empty string if not needed).
                5. marks should be 1 for EASY, 2 for MEDIUM, 3 for HARD.

                Respond ONLY with a valid JSON array (no markdown code blocks, no explanation):
                [
                  {
                    "questionText": "...",
                    "codeSnippet": "...",
                    "optionA": "...",
                    "optionB": "...",
                    "optionC": "...",
                    "optionD": "...",
                    "correctOption": "A",
                    "marks": 1
                  }
                ]
                """
                .formatted(count, req.getStack(), req.getLevel(), difficulty, req.getType(), topicClause);
    }

    private List<GeneratedQuestionDTO> parseOpenAiResponse(String responseBody, GenerateQuestionRequest req,
            String modelName) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String jsonText = root.path("choices").get(0).path("message").path("content").asText();
            return parseQuestionsJsonString(jsonText, req, modelName);
        } catch (Exception e) {
            log.warn("Failed to parse OpenAI-format JSON response: {}", e.getMessage());
            return generateLocalFallback(req);
        }
    }

    private List<GeneratedQuestionDTO> parseGeminiResponse(String responseBody, GenerateQuestionRequest req) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String jsonText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            return parseQuestionsJsonString(jsonText, req, "Gemini-2.5-Flash");
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response: {}", e.getMessage());
            return generateLocalFallback(req);
        }
    }

    private List<GeneratedQuestionDTO> parseQuestionsJsonString(String jsonText, GenerateQuestionRequest req,
            String modelName) {
        List<GeneratedQuestionDTO> result = new ArrayList<>();
        try {
            String cleanText = jsonText.trim();
            if (cleanText.startsWith("```json")) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith("```")) {
                cleanText = cleanText.substring(3);
            }
            if (cleanText.endsWith("```")) {
                cleanText = cleanText.substring(0, cleanText.length() - 3);
            }
            cleanText = cleanText.trim();

            List<Map<String, Object>> questions = objectMapper.readValue(cleanText, new TypeReference<>() {
            });

            for (int i = 0; i < questions.size(); i++) {
                Map<String, Object> q = questions.get(i);
                result.add(GeneratedQuestionDTO.builder()
                        .tempId("gen-" + i + "-" + System.currentTimeMillis())
                        .questionText(str(q, "questionText"))
                        .codeSnippet(str(q, "codeSnippet"))
                        .stack(req.getStack())
                        .type(req.getType())
                        .level(req.getLevel())
                        .difficulty(req.getDifficulty())
                        .marks(num(q, "marks"))
                        .optionA(str(q, "optionA"))
                        .optionB(str(q, "optionB"))
                        .optionC(str(q, "optionC"))
                        .optionD(str(q, "optionD"))
                        .correctOption(str(q, "correctOption"))
                        .source("AI")
                        .aiModel(modelName)
                        .examId(req.getExamId())
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to parse AI JSON array: {}", e.getMessage());
            return generateLocalFallback(req);
        }
        return result;
    }

    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "";
    }

    private Integer num(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null)
            return 1;
        try {
            return Integer.parseInt(val.toString());
        } catch (Exception e) {
            return 1;
        }
    }
}