// A1 · Task 3 — Authoring
// Exam Format Form (title, stack, duration, pass mark, pool size,
// questions per attempt, instructions) + Difficulty Band Editor (L1–L5,
// validated: starts at 0, ends at 100, no overlaps, no gaps, continuous).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchExam, fetchExams, createExam, updateExam, fetchBands, saveBands, fetchQuestions, bulkUpdateQuestions, bulkDeleteQuestions, META } from "../services/api";
import "../components/a1.css";

const LEVELS = META.LEVELS;

const emptyForm = {
    title: "",
    stack: META.STACKS[0],
    durationMin: "",
    passMark: 60,
    questionPoolSize: "",
    questionsPerAttempt: "",
    totalMarks: 100,
    instructions: "",
    difficultyMode: "NONE",
    beginnerPct: 40,
    intermediatePct: 40,
    advancedPct: 20,
};

const defaultBands = { L1: [90, 100], L2: [75, 89], L3: [60, 74], L4: [40, 59], L5: [0, 39] };

const BAND_META = {
    L1: { label: "Expert", desc: "Mastery of the stack" },
    L2: { label: "Advanced", desc: "Strong, independent capability" },
    L3: { label: "Intermediate", desc: "Competent with some gaps" },
    L4: { label: "Beginner", desc: "Foundational knowledge" },
    L5: { label: "Needs Training", desc: "Significant upskilling required" },
};

const TIME_PER_QUESTION = {
    BEGINNER: 2,
    INTERMEDIATE: 5,
    ADVANCED: 10
};

function calculateSuggestedDuration(beginnerCount, intermediateCount, advancedCount) {
    return (beginnerCount * TIME_PER_QUESTION.BEGINNER)
         + (intermediateCount * TIME_PER_QUESTION.INTERMEDIATE)
         + (advancedCount * TIME_PER_QUESTION.ADVANCED);
}

function getDifficultyComposition(poolSize, difficultyMode, beginnerPct, intermediatePct, advancedPct) {
    const total = Number(poolSize) || 0;
    if (total <= 0) {
        return { beginner: 0, intermediate: 0, advanced: 0 };
    }

    if (difficultyMode === "EASY") {
        return { beginner: total, intermediate: 0, advanced: 0 };
    }
    if (difficultyMode === "MEDIUM") {
        return { beginner: 0, intermediate: total, advanced: 0 };
    }
    if (difficultyMode === "HARD") {
        return { beginner: 0, intermediate: 0, advanced: total };
    }

    let bPct = 50, iPct = 30, aPct = 20;
    if (difficultyMode === "MANUAL") {
        bPct = Number(beginnerPct) || 0;
        iPct = Number(intermediatePct) || 0;
        aPct = Number(advancedPct) || 0;
    }

    // Largest Remainder Method
    const floatB = (total * bPct) / 100;
    const floatI = (total * iPct) / 100;
    const floatA = (total * aPct) / 100;

    let intB = Math.floor(floatB);
    let intI = Math.floor(floatI);
    let intA = Math.floor(floatA);

    let remainder = total - (intB + intI + intA);

    const items = [
        { key: 'B', frac: floatB - intB, val: intB },
        { key: 'I', frac: floatI - intI, val: intI },
        { key: 'A', frac: floatA - intA, val: intA }
    ];

    items.sort((x, y) => y.frac - x.frac);

    if (remainder > 0 && remainder <= items.length) {
        for (let k = 0; k < remainder; k++) {
            items[k].val += 1;
        }
    }

    const result = {};
    items.forEach(item => {
        result[item.key] = item.val;
    });

    return {
        beginner: result['B'] || 0,
        intermediate: result['I'] || 0,
        advanced: result['A'] || 0
    };
}

export default function AuthoringPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const examId = params.get("examId");

    const [form, setForm] = useState(emptyForm);
    const [bands, setBands] = useState(defaultBands);
    const [availableStacks, setAvailableStacks] = useState(META.STACKS);
    const [isOtherStack, setIsOtherStack] = useState(false);
    const [customStackInput, setCustomStackInput] = useState("");
    const [loading, setLoading] = useState(!!examId);
    const [savingForm, setSavingForm] = useState(false);
    const [savingBands, setSavingBands] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [bandsModified, setBandsModified] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const isInitialLoadRef = useRef(true);
    const wasCreated = useRef(false); // tracks whether last save was a create vs update
    const [availableCounts, setAvailableCounts] = useState({ beginner: 0, intermediate: 0, advanced: 0 });

    const difficultyComposition = useMemo(() => {
        return getDifficultyComposition(
            form.questionsPerAttempt,
            form.difficultyMode,
            form.beginnerPct,
            form.intermediatePct,
            form.advancedPct
        );
    }, [form.questionsPerAttempt, form.difficultyMode, form.beginnerPct, form.intermediatePct, form.advancedPct]);

    const isManualTotalValid = useMemo(() => {
        if (form.difficultyMode !== "MANUAL") return true;
        const b = Number(form.beginnerPct) || 0;
        const i = Number(form.intermediatePct) || 0;
        const a = Number(form.advancedPct) || 0;
        return (b + i + a) === 100;
    }, [form.difficultyMode, form.beginnerPct, form.intermediatePct, form.advancedPct]);



    const suggestedDuration = useMemo(() => {
        const total = Number(form.questionsPerAttempt) || 0;
        if (total <= 0) return 0;
        return calculateSuggestedDuration(
            difficultyComposition.beginner,
            difficultyComposition.intermediate,
            difficultyComposition.advanced
        );
    }, [difficultyComposition, form.questionsPerAttempt]);

    useEffect(() => {
        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            return;
        }
        setField("durationMin", suggestedDuration || "");
    }, [suggestedDuration]);

    // Load unique stacks from all existing exams on mount
    useEffect(() => {
        fetchExams().then((res) => {
            const list = res?.rows || (Array.isArray(res) ? res : []);
            const customStacks = list.map(e => e.stack).filter(Boolean);
            setAvailableStacks(Array.from(new Set([...META.STACKS, ...customStacks])));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        // Always reset the success modal when examId changes (e.g. navigating from
        // edit mode → create mode). React Router reuses this component instance,
        // so we must clear transient UI state explicitly.
        setShowSuccessModal(false);
        setSavedMsg("");

        if (!examId) {
            setForm(emptyForm);
            setBands(defaultBands);
            setBandsModified(false);
            setIsOtherStack(false);
            setCustomStackInput("");
            setAvailableCounts({ beginner: 0, intermediate: 0, advanced: 0 });
            isInitialLoadRef.current = false;
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all([fetchExam(examId), fetchBands(examId)]).then(([exam, b]) => {
            if (exam) {
                setForm({
                    title: exam.title,
                    stack: exam.stack,
                    durationMin: exam.durationMin,
                    passMark: exam.passMark,
                    questionPoolSize: exam.questionPoolSize,
                    questionsPerAttempt: exam.questionsPerAttempt,
                    totalMarks: exam.totalMarks || 100,
                    instructions: exam.instructions || "",
                    difficultyMode: exam.difficultyMode || "NONE",
                    beginnerPct: exam.beginnerPct !== undefined && exam.beginnerPct !== null ? exam.beginnerPct : 40,
                    intermediatePct: exam.intermediatePct !== undefined && exam.intermediatePct !== null ? exam.intermediatePct : 40,
                    advancedPct: exam.advancedPct !== undefined && exam.advancedPct !== null ? exam.advancedPct : 20,
                });
                setAvailableCounts({
                    beginner: exam.beginnerQuestionCount || 0,
                    intermediate: exam.intermediateQuestionCount || 0,
                    advanced: exam.advancedQuestionCount || 0
                });
                if (exam.stack && !META.STACKS.includes(exam.stack)) {
                    setIsOtherStack(true);
                    setCustomStackInput(exam.stack);
                } else {
                    setIsOtherStack(false);
                    setCustomStackInput("");
                }
                setAvailableStacks((prev) => Array.from(new Set([...prev, exam.stack].filter(Boolean))));
                isInitialLoadRef.current = true;
            }
            setBands(b && Object.keys(b).length > 0 ? b : defaultBands);
            setBandsModified(false);
            setLoading(false);
        });
    }, [examId]);

    const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const handleNumberChange = (key, val) => {
        setField(key, val);
    };

    const validationErrors = useMemo(() => {
        const errors = {};
        
        const duration = Number(form.durationMin);
        if (form.durationMin !== "") {
            if (duration > 1000) {
                errors.durationMin = "Duration cannot exceed 1000 minutes.";
            } else if (duration < 1) {
                errors.durationMin = "Duration must be at least 1 minute.";
            }
        }
        
        const pool = Number(form.questionPoolSize);
        if (form.questionPoolSize !== "") {
            if (pool > 1000) {
                errors.questionPoolSize = "Question pool size cannot exceed 1000.";
            } else if (pool < 1) {
                errors.questionPoolSize = "Question pool size must be at least 1.";
            }
        }
        
        const attempt = Number(form.questionsPerAttempt);
        if (form.questionsPerAttempt !== "") {
            if (attempt > 100) {
                errors.questionsPerAttempt = "Questions per attempt cannot exceed 100.";
            } else if (attempt < 1) {
                errors.questionsPerAttempt = "Questions per attempt must be at least 1.";
            }
        }
        
        if (attempt > 0 && pool > 0 && attempt > pool) {
            errors.questionsPerAttemptCompare = "Questions per attempt cannot exceed the question pool size.";
        }
        
        const marks = Number(form.totalMarks);
        if (form.totalMarks !== "") {
            if (marks > 100) {
                errors.totalMarks = "Total marks cannot exceed 100.";
            } else if (marks < 1) {
                errors.totalMarks = "Total marks must be at least 1.";
            }
        }

        const pass = Number(form.passMark);
        if (form.passMark !== "") {
            if (pass > 100) {
                errors.passMark = "Pass mark cannot exceed 100%.";
            } else if (pass < 0) {
                errors.passMark = "Pass mark cannot be negative.";
            }
        }
        
        if (form.difficultyMode === "MANUAL") {
            const b = Number(form.beginnerPct) || 0;
            const i = Number(form.intermediatePct) || 0;
            const a = Number(form.advancedPct) || 0;
            
            if (form.beginnerPct !== "" && b > 100) errors.beginnerPct = "Percentage cannot exceed 100%.";
            if (form.beginnerPct !== "" && b < 0) errors.beginnerPct = "Percentage cannot be negative.";
            
            if (form.intermediatePct !== "" && i > 100) errors.intermediatePct = "Percentage cannot exceed 100%.";
            if (form.intermediatePct !== "" && i < 0) errors.intermediatePct = "Percentage cannot be negative.";
            
            if (form.advancedPct !== "" && a > 100) errors.advancedPct = "Percentage cannot exceed 100%.";
            if (form.advancedPct !== "" && a < 0) errors.advancedPct = "Percentage cannot be negative.";
            
            if (b + i + a !== 100) {
                errors.manualTotal = `Difficulty distribution must equal exactly 100% (currently ${b + i + a}%).`;
            }
        }
        
        return errors;
    }, [form]);

    const hasValidationErrors = Object.keys(validationErrors).length > 0;

    const isPoolTooSmall = useMemo(() => {
        const pool = Number(form.questionPoolSize) || 0;
        const attempt = Number(form.questionsPerAttempt) || 0;
        return attempt > pool;
    }, [form.questionPoolSize, form.questionsPerAttempt]);

    const minRequired = Number(form.questionsPerAttempt) || 0;
    const poolTooSmall = Number(form.questionPoolSize) < minRequired;

    const submitFormatForm = async (e) => {
        e.preventDefault();

        if (hasValidationErrors) {
            return;
        }



        setSavingForm(true);
        setSavedMsg("");
        const payload = {
            ...form,
            durationMin: Number(form.durationMin),
            passMark: Number(form.passMark),
            questionPoolSize: Number(form.questionPoolSize),
            questionsPerAttempt: Number(form.questionsPerAttempt),
            totalMarks: Number(form.totalMarks),
            beginnerPct: form.difficultyMode === "MANUAL" ? Number(form.beginnerPct) : null,
            intermediatePct: form.difficultyMode === "MANUAL" ? Number(form.intermediatePct) : null,
            advancedPct: form.difficultyMode === "MANUAL" ? Number(form.advancedPct) : null,
        };
        if (examId) {
            wasCreated.current = false;
            await updateExam(examId, payload);
        } else {
            wasCreated.current = true;
            const created = await createExam(payload);
            setParams({ examId: created.id }, { replace: true });
        }
        setSavingForm(false);
        setShowSuccessModal(true);
    };

    const bandErrors = useMemo(() => validateBands(bands), [bands]);

    const setBandValue = (level, idx, value) => {
        setBandsModified(true);
        setBands((prev) => {
            const currentRange = prev[level] || [0, 0];
            const next = { ...prev, [level]: [...currentRange] };
            next[level][idx] = value === "" ? "" : Number(value);
            return next;
        });
    };

    const submitBands = async () => {
        if (bandErrors.length > 0 || !bandsModified) return;
        setSavingBands(true);
        await saveBands(examId, bands);
        setSavingBands(false);
        setBandsModified(false);
        setSavedMsg("Difficulty bands saved.");
    };

    if (loading) return <div className="a1-page a1-loading">Loading…</div>;

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Authoring</h1>
                    <p className="a1-sub">
                        {examId ? `Editing Exam: ${form.title || "Certification Exam"}` : "Configure a new exam's format, then define its difficulty bands."}
                    </p>
                </div>
            </header>

            {savedMsg && <div className="a1-banner a1-banner-green a1-banner-slim">{savedMsg}</div>}

            <div className="a1-grid-2">
                {/* Exam Format Form */}
                <div className="a1-card">
                    <h2>Exam Format</h2>
                    <form onSubmit={submitFormatForm}>
                        <div className="a1-form-grid">
                            <div className="a1-field">
                                <label>Exam Title *</label>
                                <input
                                    required
                                    maxLength={32}
                                    placeholder="e.g. Java Backend Developer"
                                    value={form.title}
                                    onChange={(e) => setField("title", e.target.value.slice(0, 32))}
                                />
                            </div>
                            <div className="a1-field">
                                <label>Technology Stack *</label>
                                <select 
                                    value={isOtherStack ? "__other__" : form.stack} 
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "__other__") {
                                            setIsOtherStack(true);
                                            setField("stack", customStackInput);
                                        } else {
                                            setIsOtherStack(false);
                                            setField("stack", val);
                                        }
                                    }}
                                >
                                    {availableStacks.map((s) => <option key={s} value={s}>{s}</option>)}
                                    <option value="__other__">Other / Add Manually...</option>
                                </select>

                                {isOtherStack && (
                                    <input
                                        required
                                        maxLength={32}
                                        style={{ marginTop: "8px" }}
                                        placeholder="Enter custom stack name (e.g. Go)"
                                        value={customStackInput}
                                        onChange={(e) => {
                                            const val = e.target.value.slice(0, 32);
                                            setCustomStackInput(val);
                                            setField("stack", val);
                                        }}
                                    />
                                )}
                            </div>
                            <div className="a1-field">
                                <label>Pass Mark (%) *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={form.passMark} 
                                    onChange={(e) => handleNumberChange("passMark", e.target.value)} 
                                />
                                {validationErrors.passMark && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.passMark}
                                    </span>
                                )}
                            </div>
                            <div className="a1-field">
                                <label>Question Pool Size *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={form.questionPoolSize} 
                                    onChange={(e) => handleNumberChange("questionPoolSize", e.target.value)} 
                                />
                                {validationErrors.questionPoolSize && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.questionPoolSize}
                                    </span>
                                )}
                            </div>
                            <div className="a1-field">
                                <label>Questions Per Attempt *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={form.questionsPerAttempt} 
                                    onChange={(e) => handleNumberChange("questionsPerAttempt", e.target.value)} 
                                />
                                {validationErrors.questionsPerAttempt && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.questionsPerAttempt}
                                    </span>
                                )}
                                {validationErrors.questionsPerAttemptCompare && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.questionsPerAttemptCompare}
                                    </span>
                                )}
                            </div>
                            <div className="a1-field">
                                <label>Total Marks *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={form.totalMarks} 
                                    onChange={(e) => handleNumberChange("totalMarks", e.target.value)} 
                                />
                                {validationErrors.totalMarks && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.totalMarks}
                                    </span>
                                )}
                            </div>
                            <div className="a1-field">
                                <label>Difficulty Mode</label>
                                <select 
                                    value={form.difficultyMode || "NONE"} 
                                    onChange={(e) => setField("difficultyMode", e.target.value)}
                                >
                                    <option value="NONE">None (Auto-distribute)</option>
                                    <option value="EASY">Beginner</option>
                                    <option value="MEDIUM">Intermediate</option>
                                    <option value="HARD">Advanced</option>
                                    <option value="MANUAL">Manual Distribution</option>
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Duration (minutes) *</label>
                                <input 
                                    type="number" 
                                    required 
                                    value={form.durationMin} 
                                    onChange={(e) => handleNumberChange("durationMin", e.target.value)} 
                                />
                                {validationErrors.durationMin && (
                                    <span style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", display: "block" }}>
                                        {validationErrors.durationMin}
                                    </span>
                                )}
                            </div>
                        </div>

                        {form.difficultyMode === "MANUAL" && (
                            <div className="a1-card" style={{ marginTop: 14, padding: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--a1-navy)", marginBottom: 4 }}>Difficulty Distribution</h3>
                                <p style={{ fontSize: 11, color: "var(--a1-mut)", marginBottom: 12 }}>Define exactly how the question pool should be divided.</p>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                                    <div className="a1-field">
                                        <label style={{ fontSize: 12 }}>Beginner (%)</label>
                                        <input 
                                            type="number" 
                                            value={form.beginnerPct} 
                                            onChange={(e) => handleNumberChange("beginnerPct", e.target.value)} 
                                        />
                                        {validationErrors.beginnerPct && (
                                            <span style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", display: "block" }}>
                                                {validationErrors.beginnerPct}
                                            </span>
                                        )}
                                    </div>
                                    <div className="a1-field">
                                        <label style={{ fontSize: 12 }}>Intermediate (%)</label>
                                        <input 
                                            type="number" 
                                            value={form.intermediatePct} 
                                            onChange={(e) => handleNumberChange("intermediatePct", e.target.value)} 
                                        />
                                        {validationErrors.intermediatePct && (
                                            <span style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", display: "block" }}>
                                                {validationErrors.intermediatePct}
                                            </span>
                                        )}
                                    </div>
                                    <div className="a1-field">
                                        <label style={{ fontSize: 12 }}>Advanced (%)</label>
                                        <input 
                                            type="number" 
                                            value={form.advancedPct} 
                                            onChange={(e) => handleNumberChange("advancedPct", e.target.value)} 
                                        />
                                        {validationErrors.advancedPct && (
                                            <span style={{ color: "#ef4444", fontSize: "10px", marginTop: "4px", display: "block" }}>
                                                {validationErrors.advancedPct}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between", 
                                    padding: "8px 12px", 
                                    background: ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) === 100 ? "#ecfdf5" : "#fffbeb", 
                                    border: ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) === 100 ? "1.5px solid #10b981" : "1.5px solid #f59e0b", 
                                    borderRadius: 6, 
                                    fontSize: 12, 
                                    fontWeight: 700, 
                                    color: ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) === 100 ? "#065f46" : "#b45309", 
                                    marginBottom: 14 
                                }}>
                                    <span>Distribution: {form.beginnerPct || 0}% + {form.intermediatePct || 0}% + {form.advancedPct || 0}%</span>
                                    <span>
                                        {((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) === 100 ? "✓ 100%" : `⚠ Distribution must total 100% (currently ${(Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)}%)`}
                                    </span>
                                </div>

                                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--a1-navy)", marginBottom: 8 }}>
                                        Questions (based on Questions Per Attempt: {form.questionsPerAttempt})
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--a1-navy)", marginBottom: 2 }}>
                                                <span>Beginner</span>
                                                <strong>{difficultyComposition.beginner} questions (Available: {availableCounts.beginner})</strong>
                                            </div>
                                            <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                                <div style={{ 
                                                    width: `${((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) > 0 ? (form.beginnerPct / Math.max(100, ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)))) * 100 : 0}%`, 
                                                    background: "#2f6bff", 
                                                    height: "100%" 
                                                }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--a1-navy)", marginBottom: 2 }}>
                                                <span>Intermediate</span>
                                                <strong>{difficultyComposition.intermediate} questions (Available: {availableCounts.intermediate})</strong>
                                            </div>
                                            <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                                <div style={{ 
                                                    width: `${((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) > 0 ? (form.intermediatePct / Math.max(100, ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)))) * 100 : 0}%`, 
                                                    background: "#10b981", 
                                                    height: "100%" 
                                                }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--a1-navy)", marginBottom: 2 }}>
                                                <span>Advanced</span>
                                                <strong>{difficultyComposition.advanced} questions (Available: {availableCounts.advanced})</strong>
                                            </div>
                                            <div style={{ width: "100%", background: "#f1f5f9", borderRadius: 4, height: 6, overflow: "hidden" }}>
                                                <div style={{ 
                                                    width: `${((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)) > 0 ? (form.advancedPct / Math.max(100, ((Number(form.beginnerPct) || 0) + (Number(form.intermediatePct) || 0) + (Number(form.advancedPct) || 0)))) * 100 : 0}%`, 
                                                    background: "#f59e0b", 
                                                    height: "100%" 
                                                }} />
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "var(--a1-navy)", borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 4 }}>
                                            <span>Total</span>
                                            <span>
                                                {difficultyComposition.beginner + difficultyComposition.intermediate + difficultyComposition.advanced} / {form.questionsPerAttempt} questions
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}



                        <div className={`a1-pool-note ${poolTooSmall ? "a1-pool-warn" : ""}`} style={{ marginTop: 14 }}>
                            Question Pool = {form.questionPoolSize || 0} · Per Attempt = {form.questionsPerAttempt || 0} · Minimum
                            Required Questions = {minRequired}
                            {poolTooSmall && " — pool is smaller than questions per attempt."}
                        </div>

                        {hasValidationErrors && (
                            <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginTop: 14 }}>
                                ⚠ Please correct the validation errors above before saving.
                            </div>
                        )}

                        <div className="a1-modal-actions" style={{ marginTop: 16, justifyContent: "flex-start" }}>
                            <button 
                                className="a1-btn a1-btn-primary" 
                                disabled={savingForm || hasValidationErrors}
                                style={{
                                    cursor: (savingForm || hasValidationErrors) ? 'not-allowed' : 'pointer',
                                    opacity: (savingForm || hasValidationErrors) ? 0.65 : 1
                                }}
                            >
                                {savingForm ? "Saving…" : "Save exam format"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Difficulty Band Editor */}
                <div className="a1-card">
                    <h2>Difficulty Band Editor</h2>
                    {!examId ? (
                        <p className="a1-sub">Create the exam first — difficulty bands are configured per exam.</p>
                    ) : (
                        <>
                            <p className="a1-sub">Ranges must cover 0–100% continuously with no gaps or overlaps.</p>
                            <table className="a1-band-table">
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        <th>Label & Interpretation</th>
                                        <th>Min %</th>
                                        <th>Max %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEVELS.map((lvl) => {
                                        const meta = BAND_META[lvl] || { label: lvl, desc: "" };
                                        const rowHasError = bandErrors.some((e) => e.startsWith(lvl));
                                        return (
                                            <tr key={lvl} className={rowHasError ? "a1-band-row-error" : ""}>
                                                <td><span className={`a1-pill a1-lvl-${lvl}`}>{lvl}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--a1-navy)" }}>{meta.label}</div>
                                                    <div style={{ fontSize: 11, color: "var(--a1-mut)" }}>{meta.desc}</div>
                                                </td>
                                                <td>
                                                    <input
                                                        className="a1-band-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={bands[lvl]?.[0] ?? ""}
                                                        onChange={(e) => setBandValue(lvl, 0, e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="a1-band-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={bands[lvl]?.[1] ?? ""}
                                                        onChange={(e) => setBandValue(lvl, 1, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {bandErrors.length > 0 ? (
                                <ul className="a1-band-errors">
                                    {bandErrors.map((e, i) => <li key={i}>⚠ {e}</li>)}
                                </ul>
                            ) : (
                                <div className="a1-band-ok">✓ Bands are continuous, 0–100%, with no gaps or overlaps.</div>
                            )}

                            <div className="a1-modal-actions" style={{ justifyContent: "flex-start" }}>
                                <button
                                    className="a1-btn a1-btn-primary"
                                    disabled={savingBands || bandErrors.length > 0 || !bandsModified}
                                    onClick={submitBands}
                                    title={!bandsModified ? "Modify at least one band value to enable saving" : ""}
                                >
                                    {savingBands ? "Saving…" : "Save difficulty bands"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Success Modal — shown after "Save exam format" */}
            {showSuccessModal && (
                <div className="a1-modal-overlay" onClick={() => { setShowSuccessModal(false); navigate("/admin/exams"); }}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", padding: "36px 32px" }}>
                        {/* Success icon */}
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%",
                            background: "linear-gradient(135deg, #22c55e, #16a34a)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 20px", boxShadow: "0 6px 20px rgba(34,197,94,.4)"
                        }}>
                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>

                        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 700, color: "#0E1B2E" }}>
                            {wasCreated.current ? "Exam Created Successfully!" : "Exam Format Saved!"}
                        </h3>
                        <p style={{ margin: "0 0 28px", fontSize: 13.5, color: "#5C6B82", lineHeight: 1.6, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
                            {wasCreated.current
                                ? "Your new exam has been created as a draft and is ready for difficulty band configuration."
                                : "Your exam format has been updated successfully."}
                        </p>

                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <button
                                className="a1-btn a1-btn-ghost"
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate("/admin/authoring");
                                }}
                            >
                                Stay Here
                            </button>
                            <button
                                className="a1-btn a1-btn-primary"
                                onClick={() => { setShowSuccessModal(false); navigate("/admin/exams"); }}
                            >
                                Go to Exams Library
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

// Must cover 0 to 100, no overlaps, no gaps, continuous ranges only.
function validateBands(bands) {
    const errors = [];
    
    // 1. Initial validation of input completeness and values
    for (const lvl of LEVELS) {
        const range = bands[lvl];
        const start = range?.[0];
        const end = range?.[1];

        if (start === "" || end === "" || start == null || end == null) {
            errors.push(`${lvl}: enter both a start and an end value`);
            continue;
        }

        const startNum = Number(start);
        const endNum = Number(end);

        if (isNaN(startNum) || isNaN(endNum)) {
            errors.push(`${lvl}: start and end must be valid numbers`);
            continue;
        }
        if (startNum < 0 || startNum > 100 || endNum < 0 || endNum > 100) {
            errors.push(`${lvl}: values must be between 0 and 100`);
            continue;
        }
        if (startNum > endNum) {
            errors.push(`${lvl}: min score must not be greater than max score`);
        }
    }

    if (errors.length > 0) {
        return errors;
    }

    // 2. Continuity checks over sorted range
    const sortedLevels = [...LEVELS].sort((a, b) => Number(bands[a][0]) - Number(bands[b][0]));
    let prevEnd = null;

    sortedLevels.forEach((lvl, idx) => {
        const range = bands[lvl];
        const start = Number(range[0]);
        const end = Number(range[1]);

        if (idx === 0 && start !== 0) {
            errors.push(`${lvl}: lowest band range must start at 0%`);
        }
        if (idx === sortedLevels.length - 1 && end !== 100) {
            errors.push(`${lvl}: highest band range must end at 100%`);
        }
        if (prevEnd !== null) {
            if (start <= prevEnd) {
                errors.push(`${lvl}: overlaps with the previous band range`);
            } else if (start > prevEnd + 1) {
                errors.push(`${lvl}: leaves a gap after the previous band range`);
            }
        }
        prevEnd = end;
    });

    return errors;
}