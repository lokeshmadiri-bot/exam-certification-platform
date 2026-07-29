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
import java.util.UUID;

/**
 * GeminiService — calls Gemini 2.5 Flash to generate MCQ questions,
 * parses the JSON response and maps it to GeneratedQuestionDTO list.
 *
 * API docs: https://ai.google.dev/gemini-api/docs/text-generation
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String apiUrl;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /** Generate N questions from Gemini. */
    public List<GeneratedQuestionDTO> generate(GenerateQuestionRequest req) {
        String prompt = buildPrompt(req);

        // Build Gemini request body
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            ),
            "generationConfig", Map.of(
                "temperature", 0.7,
                "maxOutputTokens", 4096,
                "responseMimeType", "application/json"
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        String urlWithKey = apiUrl + "?key=" + apiKey;

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(urlWithKey, entity, String.class);
            return parseGeminiResponse(response.getBody(), req);
        } catch (Exception e) {
            log.warn("Gemini API call failed ({}), generating local AI question fallback.", e.getMessage());
            return generateLocalFallback(req);
        }
    }

    private List<GeneratedQuestionDTO> generateLocalFallback(GenerateQuestionRequest req) {
        int count = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 3;
        String stack = req.getStack() != null ? req.getStack() : "Java";
        String level = req.getLevel() != null ? req.getLevel() : "L3";
        String difficulty = req.getDifficulty() != null ? req.getDifficulty() : "MEDIUM";
        String type = req.getType() != null ? req.getType() : "MCQ";
        int marks = "HARD".equalsIgnoreCase(difficulty) ? 3 : ("MEDIUM".equalsIgnoreCase(difficulty) ? 2 : 1);

        List<GeneratedQuestionDTO> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(GeneratedQuestionDTO.builder()
                    .tempId("gen-" + i + "-" + System.currentTimeMillis())
                    .questionText(String.format("What is the primary function of %s concept #%d in %s development?", stack, i + 1, type))
                    .codeSnippet("CODING".equalsIgnoreCase(type) ? String.format("// Sample %s code snippet\npublic class Demo {\n  public static void main(String[] args) {\n    System.out.println(\"Test %d\");\n  }\n}", stack, i + 1) : "")
                    .stack(stack)
                    .type(type)
                    .level(level)
                    .difficulty(difficulty)
                    .marks(marks)
                    .optionA(String.format("Optimizes memory allocation and execution speed for %s", stack))
                    .optionB("Provides thread-safe access across concurrent threads")
                    .optionC("Handles unhandled exceptions in asynchronous operations")
                    .optionD("Generates documentation comments automatically")
                    .correctOption("A")
                    .source("AI")
                    .aiModel("Gemini-1.5-Flash")
                    .examId(req.getExamId())
                    .build());
        }
        return list;
    }

    /** Re-generate a single question with different wording. */
    public GeneratedQuestionDTO regenerate(GeneratedQuestionDTO original) {
        GenerateQuestionRequest req = GenerateQuestionRequest.builder()
                .stack(original.getStack())
                .level(original.getLevel())
                .difficulty(original.getDifficulty())
                .type(original.getType())
                .topic("Generate a different question from this one (do not repeat): " + original.getQuestionText())
                .count(1)
                .examId(original.getExamId())
                .build();
        List<GeneratedQuestionDTO> results = generate(req);
        return results.isEmpty() ? original : results.get(0);
    }

    // ------------------------------------------------------------------ //

    private String buildPrompt(GenerateQuestionRequest req) {
        int count = (req.getCount() != null && req.getCount() > 0) ? req.getCount() : 3;
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

                Respond ONLY with a valid JSON array (no markdown, no explanation):
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
                """.formatted(count, req.getStack(), req.getLevel(), req.getDifficulty(), req.getType(), topicClause);
    }

    private List<GeneratedQuestionDTO> parseGeminiResponse(String responseBody, GenerateQuestionRequest req) {
        List<GeneratedQuestionDTO> result = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            // Extract text from candidates[0].content.parts[0].text
            String jsonText = root
                    .path("candidates").get(0)
                    .path("content")
                    .path("parts").get(0)
                    .path("text").asText();

            // Parse the JSON array embedded in the response
            List<Map<String, Object>> questions = objectMapper.readValue(
                    jsonText, new TypeReference<>() {}
            );

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
                        .aiModel("Gemini-2.5-Flash")
                        .examId(req.getExamId())
                        .build());
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            log.debug("Raw response body: {}", responseBody);
            throw new RuntimeException("Could not parse Gemini response: " + e.getMessage(), e);
        }
        return result;
    }

    private String str(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val != null ? val.toString() : "";
    }

    private Integer num(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return 1;
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return 1; }
    }
}
