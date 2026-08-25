package com.oryfolks.certify.util;

import java.util.ArrayList;
import java.util.List;

public class DifficultyCalculator {

    public static class DifficultyCounts {
        private final int beginner;
        private final int intermediate;
        private final int advanced;

        public DifficultyCounts(int beginner, int intermediate, int advanced) {
            this.beginner = beginner;
            this.intermediate = intermediate;
            this.advanced = advanced;
        }

        public int getBeginner() { return beginner; }
        public int getIntermediate() { return intermediate; }
        public int getAdvanced() { return advanced; }
    }

    public static DifficultyCounts calculateCounts(int total, int bPct, int iPct, int aPct) {
        if (total <= 0) {
            return new DifficultyCounts(0, 0, 0);
        }

        double floatB = (total * bPct) / 100.0;
        double floatI = (total * iPct) / 100.0;
        double floatA = (total * aPct) / 100.0;

        int intB = (int) Math.floor(floatB);
        int intI = (int) Math.floor(floatI);
        int intA = (int) Math.floor(floatA);

        int remainder = total - (intB + intI + intA);

        double fracB = floatB - intB;
        double fracI = floatI - intI;
        double fracA = floatA - intA;

        class Element {
            String key;
            double frac;
            int val;
            Element(String key, double frac, int val) {
                this.key = key;
                this.frac = frac;
                this.val = val;
            }
        }
        List<Element> elements = new ArrayList<>();
        elements.add(new Element("B", fracB, intB));
        elements.add(new Element("I", fracI, intI));
        elements.add(new Element("A", fracA, intA));

        // Sort elements by fraction descending
        elements.sort((x, y) -> Double.compare(y.frac, x.frac));

        if (remainder > 0 && remainder <= elements.size()) {
            for (int k = 0; k < remainder; k++) {
                elements.get(k).val += 1;
            }
        }

        int finalB = 0, finalI = 0, finalA = 0;
        for (Element e : elements) {
            if ("B".equals(e.key)) finalB = e.val;
            else if ("I".equals(e.key)) finalI = e.val;
            else if ("A".equals(e.key)) finalA = e.val;
        }

        return new DifficultyCounts(finalB, finalI, finalA);
    }
}
