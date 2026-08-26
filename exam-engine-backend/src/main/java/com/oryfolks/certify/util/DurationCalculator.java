package com.oryfolks.certify.util;

public class DurationCalculator {
    public static final int BEGINNER_TIME_MINS = 2;
    public static final int INTERMEDIATE_TIME_MINS = 5;
    public static final int ADVANCED_TIME_MINS = 10;

    public static int calculateSuggestedDuration(int beginnerCount, int intermediateCount, int advancedCount) {
        return (beginnerCount * BEGINNER_TIME_MINS)
                + (intermediateCount * INTERMEDIATE_TIME_MINS)
                + (advancedCount * ADVANCED_TIME_MINS);
    }
}
