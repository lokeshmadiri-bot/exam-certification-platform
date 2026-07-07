package com.oryfolks.certify.service;

import com.oryfolks.certify.repository.CompetencyBandRepository;
import com.oryfolks.certify.repository.ExamRepository;
import com.oryfolks.certify.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.oryfolks.certify.dto.ExamCardResponseDTO;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.enums.ExamStatus;

import java.util.List;
import java.util.stream.Collectors;
import com.oryfolks.certify.dto.CompetencyBandDTO;
import com.oryfolks.certify.dto.ExamDetailsResponseDTO;
import com.oryfolks.certify.entity.CompetencyBand;
import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.exception.ResourceNotFoundException;

import java.util.UUID;

import com.oryfolks.certify.dto.QuestionResponseDTO;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class ExamService {

    private final ExamRepository examRepository;

    private final QuestionRepository questionRepository;

    private final CompetencyBandRepository competencyBandRepository;

    public List<ExamCardResponseDTO> getAvailableExams() {

        List<Exam> exams = examRepository.findByStatus(ExamStatus.ACTIVE);

        return exams.stream()
                .map(exam -> ExamCardResponseDTO.builder()
                        .examId(exam.getId())
                        .title(exam.getTitle())
                        .stack(exam.getStack())
                        .durationMinutes(exam.getDurationMinutes())
                        .perAttempt(exam.getPerAttempt())
                        .passMark(exam.getPassMark())
                        .version(exam.getVersion())
                        .status(exam.getStatus())
                        .build())
                .collect(Collectors.toList());
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
                .collect(Collectors.toList());

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
                .collect(Collectors.toList());
    }

}