package com.oryfolks.certify;

import com.oryfolks.certify.entity.Exam;
import com.oryfolks.certify.entity.Question;
import com.oryfolks.certify.exception.BadRequestException;
import com.oryfolks.certify.util.DifficultyCalculator;
import com.oryfolks.certify.util.DurationCalculator;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ExamDifficultyAndDurationTests {

    @Test
    public void testDifficultyValidationAndMockScenarios() {
        // 40 / 40 / 20 -> valid
        assertTrue(isValidManual(40, 40, 20));
        // 50 / 30 / 20 -> valid
        assertTrue(isValidManual(50, 30, 20));

        // 40 / 40 / 10 -> invalid
        assertFalse(isValidManual(40, 40, 10));
        // 50 / 40 / 30 -> invalid
        assertFalse(isValidManual(50, 40, 30));
        // -10 / 50 / 60 -> invalid
        assertFalse(isValidManual(-10, 50, 60));
        // 101 / 0 / 0 -> invalid
        assertFalse(isValidManual(101, 0, 0));
    }

    private boolean isValidManual(int b, int i, int a) {
        try {
            if (b < 0 || b > 100 || i < 0 || i > 100 || a < 0 || a > 100) {
                throw new BadRequestException("Range error");
            }
            if (b + i + a != 100) {
                throw new BadRequestException("Sum error");
            }
            return true;
        } catch (BadRequestException ex) {
            return false;
        }
    }

    @Test
    public void testQuestionCountCalculations() {
        // 100 questions -> 40/40/20 -> 40/40/20
        DifficultyCalculator.DifficultyCounts c1 = DifficultyCalculator.calculateCounts(100, 40, 40, 20);
        assertEquals(40, c1.getBeginner());
        assertEquals(40, c1.getIntermediate());
        assertEquals(20, c1.getAdvanced());
        assertEquals(100, c1.getBeginner() + c1.getIntermediate() + c1.getAdvanced());

        // 200 questions -> 25/50/25 -> 50/100/50
        DifficultyCalculator.DifficultyCounts c2 = DifficultyCalculator.calculateCounts(200, 25, 50, 25);
        assertEquals(50, c2.getBeginner());
        assertEquals(100, c2.getIntermediate());
        assertEquals(50, c2.getAdvanced());
        assertEquals(200, c2.getBeginner() + c2.getIntermediate() + c2.getAdvanced());

        // 250 questions -> 30/50/20 -> 75/125/50
        DifficultyCalculator.DifficultyCounts c3 = DifficultyCalculator.calculateCounts(250, 30, 50, 20);
        assertEquals(75, c3.getBeginner());
        assertEquals(125, c3.getIntermediate());
        assertEquals(50, c3.getAdvanced());
        assertEquals(250, c3.getBeginner() + c3.getIntermediate() + c3.getAdvanced());
    }

    @Test
    public void testRoundingNonDivisiblePools() {
        // 101 questions -> 40/40/20 -> sums to 101
        DifficultyCalculator.DifficultyCounts c1 = DifficultyCalculator.calculateCounts(101, 40, 40, 20);
        assertEquals(101, c1.getBeginner() + c1.getIntermediate() + c1.getAdvanced());

        // 99 questions -> 40/40/20 -> sums to 99
        DifficultyCalculator.DifficultyCounts c2 = DifficultyCalculator.calculateCounts(99, 40, 40, 20);
        assertEquals(99, c2.getBeginner() + c2.getIntermediate() + c2.getAdvanced());

        // 73 questions -> 40/40/20 -> sums to 73
        DifficultyCalculator.DifficultyCounts c3 = DifficultyCalculator.calculateCounts(73, 40, 40, 20);
        assertEquals(73, c3.getBeginner() + c3.getIntermediate() + c3.getAdvanced());

        // 37 questions -> 40/40/20 -> sums to 37
        DifficultyCalculator.DifficultyCounts c4 = DifficultyCalculator.calculateCounts(37, 40, 40, 20);
        assertEquals(37, c4.getBeginner() + c4.getIntermediate() + c4.getAdvanced());
    }

    @Test
    public void testDurationCalculations() {
        // Beginner only: 50 Qs * 1 min = 50 mins
        int d1 = DurationCalculator.calculateSuggestedDuration(50, 0, 0);
        assertEquals(50, d1);

        // Intermediate only: 50 Qs * 2 min = 100 mins
        int d2 = DurationCalculator.calculateSuggestedDuration(0, 50, 0);
        assertEquals(100, d2);

        // Advanced only: 50 Qs * 3 min = 150 mins
        int d3 = DurationCalculator.calculateSuggestedDuration(0, 0, 50);
        assertEquals(150, d3);

        // Auto-distribute: 100 questions -> 50% Easy (50), 30% Medium (30), 20% Hard (20)
        // 50*1 + 30*2 + 20*3 = 50 + 60 + 60 = 170 mins
        int d4 = DurationCalculator.calculateSuggestedDuration(50, 30, 20);
        assertEquals(170, d4);

        // Manual 40/40/20 on 100 Qs: 40 Easy, 40 Medium, 20 Hard
        // 40*1 + 40*2 + 20*3 = 40 + 80 + 60 = 180 mins
        int d5 = DurationCalculator.calculateSuggestedDuration(40, 40, 20);
        assertEquals(180, d5);
    }
}
