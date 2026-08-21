// AIQuestionGenerator.jsx
// Self-contained AI generation panel:
//   Step 1 — config form (stack, level, difficulty, type, count, topic)
//   Step 2 — preview list with edit / delete / regenerate per card
//   Step 3 — Approve & Save to bank
//
// Props:
//   examId  (optional string) — pre-selects exam when called from ExamsLibraryPage
//   onClose — callback when the panel is closed (cancel or after save)
//   onSaved — callback after questions are successfully saved, receives saved count
import React, { useState, useRef, useMemo } from "react";
import { generateAIQuestions, saveAIQuestions, regenerateAIQuestion, META } from "../services/api";
import "./a1.css";

const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
// NONE means auto-distribute: 50% Easy, 30% Medium, 20% Hard
const DEFAULT_FORM = {
    stack: "",
    level: "L3",
    difficulty: "NONE",
    type: "MCQ",
    count: 10,
    poolSize: 50,
    topic: "",
    examId: "",
};
 
const LEVEL_LABELS = { L1: "L1 · Expert", L2: "L2 · Advanced", L3: "L3 · Intermediate", L4: "L4 · Elementary", L5: "L5 · Beginner" };
 
export default function AIQuestionGenerator({ examId, exams = [], onClose, onSaved }) {
    const filteredExams = exams.filter((ex) => {
        if (!ex.id) return false;
        const idStr = ex.id.toString();
        const titleStr = (ex.title || "").toString();
        return !idStr.startsWith("17") && !titleStr.includes("17");
    });
    const [step, setStep] = useState("form"); // "form" | "preview" | "saving"
    
    // Resolve initial exam and counts
    const defaultExamId = examId || (filteredExams[0]?.id || "");
    const defaultExam = filteredExams.find(ex => String(ex.id) === String(defaultExamId));

    const [initialAvailable, setInitialAvailable] = useState(
        defaultExam ? (defaultExam.currentQuestionCount ?? 0) : 0
    );
    const [form, setForm] = useState({
        ...DEFAULT_FORM,
        examId: defaultExamId,
        poolSize: defaultExam ? (defaultExam.questionPoolSize ?? defaultExam.questionPool ?? 50) : 50,
        stack: defaultExam ? (defaultExam.stack || "") : "",
    });

    const [questions, setQuestions] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [regeneratingIdx, setRegeneratingIdx] = useState(null);
    const [editingIdx, setEditingIdx] = useState(null);

    // Populate available stacks from default list + custom exam stacks
    const availableStacks = useMemo(() => {
        const customStacks = exams.map((e) => e.stack).filter(Boolean);
        return Array.from(new Set([...META.STACKS, ...customStacks]));
    }, [exams]);

    // New continuous pool generation states
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [showConfirm, setShowConfirm] = useState(null); // null | "generate_more" | "approve_save" | "cancel" | "clear_start_over"
    const cancelRef = useRef(false);

    // Minimize & Completion Notification states
    const [minimized, setMinimized] = useState(false);
    const [showCompletionPopup, setShowCompletionPopup] = useState(false);
    const prevGeneratingRef = useRef(false);

    React.useEffect(() => {
        if (prevGeneratingRef.current === true && generating === false && minimized === true) {
            setShowCompletionPopup(true);
        }
        prevGeneratingRef.current = generating;
    }, [generating, minimized]);

    // Sync pool size and available limit once filteredExams are populated or form.examId changes
    React.useEffect(() => {
        if (filteredExams.length > 0) {
            const matchedExam = filteredExams.find(ex => String(ex.id) === String(form.examId));
            if (matchedExam) {
                const pSize = matchedExam.questionPoolSize ?? matchedExam.questionPool ?? 50;
                const avCount = matchedExam.currentQuestionCount ?? 0;
                setInitialAvailable(avCount);
                setForm(f => {
                    if (f.poolSize !== pSize || f.stack !== (matchedExam.stack || "")) {
                        return {
                            ...f,
                            poolSize: pSize,
                            stack: matchedExam.stack || "",
                        };
                    }
                    return f;
                });
            }
        }
    }, [filteredExams, form.examId]);
 
    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const normalizeText = (text) => {
        if (!text) return "";
        return text.toString().trim().toLowerCase().replace(/\s+/g, " ");
    };

    // ---- Continuous Pool Generation ----
    const runGeneration = async (targetSize, existingQuestions = []) => {
        setGenerating(true);
        setError(null);
        cancelRef.current = false;

        let currentQuestions = [...existingQuestions];
        let dupCount = existingQuestions.length > 0 ? duplicateCount : 0;

        try {
            while ((initialAvailable + currentQuestions.length) < targetSize) {
                if (cancelRef.current) {
                    break;
                }

                const shortage = targetSize - (initialAvailable + currentQuestions.length);
                const batchSize = Math.min(Number(form.count) || 10, shortage);

                const payload = {
                    stack: form.stack,
                    level: form.level,
                    difficulty: (form.difficulty === "NONE" || !form.difficulty) ? null : form.difficulty,
                    type: form.type,
                    count: batchSize,
                    topic: form.topic || null,
                    examId: form.examId || null,
                };

                const result = await generateAIQuestions(payload);

                if (!result || result.length === 0) {
                    throw new Error("No questions returned from AI generator. It might be rate-limited or filtered.");
                }

                const uniqueNewQuestions = [];
                for (const q of result) {
                    const normNew = normalizeText(q.questionText);
                    if (!normNew) {
                        dupCount++;
                        continue;
                    }

                    const isDup = currentQuestions.some(existing => normalizeText(existing.questionText) === normNew);
                    if (isDup) {
                        dupCount++;
                    } else {
                        if (!q.tempId) {
                            q.tempId = `gen-${currentQuestions.length}-${Date.now()}-${Math.random()}`;
                        }
                        uniqueNewQuestions.push(q);
                        currentQuestions.push(q);
                    }
                }

                setQuestions([...currentQuestions]);
                setDuplicateCount(dupCount);

                // Yield thread control for smooth UI rendering
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        } catch (err) {
            setError(err.message || "Generation failed. Please check backend connection or API key.");
        } finally {
            setGenerating(false);
        }
    };
 
    // ---- Step 1: Generate ----
    const handleGenerate = async (e) => {
        e.preventDefault();
        setStep("preview");
        setQuestions([]);
        setDuplicateCount(0);
        await runGeneration(Number(form.poolSize) || 50, []);
    };
 
    // ---- Step 2: Edit a question inline ----
    const updateQuestion = (idx, field, value) => {
        setQuestions((prev) =>
            prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
        );
    };
 
    const deleteQuestion = (idx) => {
        setQuestions((prev) => prev.filter((_, i) => i !== idx));
    };
 
    const handleRegenerate = async (idx) => {
        setRegeneratingIdx(idx);
        setError(null);
        try {
            const updated = await regenerateAIQuestion(questions[idx]);
            setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...updated, tempId: q.tempId } : q)));
        } catch (err) {
            setError("Regenerate failed: " + err.message);
        } finally {
            setRegeneratingIdx(null);
        }
    };
 
    // ---- Step 3: Save ----
    const handleSave = async () => {
        if (questions.length === 0) return;
        setStep("saving");
        setError(null);
        try {
            await saveAIQuestions({
                examId: form.examId || null,
                questions,
            });
            onSaved?.(questions.length);
            onClose?.();
        } catch (err) {
            setError("Save failed: " + err.message);
            setStep("preview");
        }
    };

    const handleStopGeneration = () => {
        cancelRef.current = true;
        setGenerating(false);
    };

    const handleCloseClick = () => {
        if (questions.length > 0 || generating) {
            setShowConfirm("cancel");
        } else {
            onClose?.();
        }
    };

    const handleConfirmAction = async () => {
        const action = showConfirm;
        setShowConfirm(null);

        if (action === "cancel") {
            onClose?.();
        } else if (action === "approve_save") {
            await handleSave();
        } else if (action === "generate_more") {
            const newPoolSize = Number(form.poolSize) + 10;
            setForm(f => ({ ...f, poolSize: newPoolSize }));
            await runGeneration(newPoolSize, questions);
        } else if (action === "clear_start_over") {
            setQuestions([]);
            setDuplicateCount(0);
            cancelRef.current = false;
            setStep("form");
        }
    };

    if (minimized) {
        return (
            <>
                {/* Minimized Widget */}
                <div 
                    style={{ 
                        position: "fixed", 
                        bottom: 24, 
                        right: 24, 
                        zIndex: 2000, 
                        background: "#ffffff", 
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)",
                        border: "1.5px solid var(--a1-navy)",
                        borderRadius: 12,
                        padding: "16px 20px",
                        width: 320,
                        fontFamily: "'Segoe UI', system-ui, sans-serif",
                        animation: "a1-pop .2s ease"
                    }}
                >
                    <style>{`
                        @keyframes a1-spin {
                            to { transform: rotate(360deg); }
                        }
                        .a1-spinner {
                            width: 16px;
                            height: 16px;
                            border: 2px solid rgba(22, 53, 92, 0.2);
                            border-top-color: var(--a1-navy);
                            border-radius: 50%;
                            display: inline-block;
                            animation: a1-spin 1s linear infinite;
                        }
                    `}</style>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--a1-navy)", display: "flex", alignItems: "center", gap: 6 }}>
                            {generating && <span className="a1-spinner" />}
                            ✨ AI Generation
                        </span>
                        <button 
                            className="a1-btn a1-btn-ghost a1-btn-sm" 
                            style={{ height: 24, padding: "2px 8px", fontSize: 11 }}
                            onClick={() => setMinimized(false)}
                        >
                            Maximize
                        </button>
                    </div>

                    <div style={{ fontSize: 12.5, color: "var(--a1-mut)", marginBottom: 8 }}>
                        <strong>Progress:</strong> {initialAvailable + questions.length} / {form.poolSize} Questions
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: "100%", background: "rgba(0,0,0,0.05)", borderRadius: 4, height: 6, overflow: "hidden", marginBottom: 12 }}>
                        <div 
                            style={{ 
                                width: `${Math.min(100, ((initialAvailable + questions.length) / form.poolSize) * 100)}%`, 
                                background: "var(--a1-navy)", 
                                height: "100%", 
                                transition: "width 0.3s ease" 
                            }} 
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {generating ? (
                            <button 
                                type="button" 
                                className="a1-btn a1-btn-red a1-btn-sm" 
                                style={{ height: 26, fontSize: 11, padding: "2px 10px" }}
                                onClick={handleStopGeneration}
                            >
                                Stop
                            </button>
                        ) : (
                            <span style={{ fontSize: 11.5, color: "var(--a1-green)", fontWeight: 700 }}>
                                ✓ Finished
                            </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--a1-mut)" }}>
                            {questions.length} new generated
                        </span>
                    </div>
                </div>

                {/* Completion Popup Toast */}
                {showCompletionPopup && (() => {
                    const isSuccess = (initialAvailable + questions.length) >= form.poolSize;
                    const titleText = isSuccess ? "🔔 Generation Complete" : "⚠ Generation Stopped";
                    const titleColor = isSuccess ? "#065f46" : "#92400e";
                    const cardBg = isSuccess ? "#ecfdf5" : "#fffbeb";
                    const cardBorder = isSuccess ? "1.5px solid #059669" : "1.5px solid #d97706";
                    const closeColor = isSuccess ? "#059669" : "#d97706";
                    const btnBg = isSuccess ? "#15803d" : "#b45309";
                    const bodyText = isSuccess 
                        ? `AI has successfully generated ${questions.length} questions. Target pool size has been reached!` 
                        : error 
                            ? `Generation stopped before reaching target pool size. Error: ${error}` 
                            : `Generation was stopped manually. ${questions.length} new question(s) generated.`;

                    return (
                        <div 
                            style={{ 
                                position: "fixed", 
                                inset: 0, 
                                background: "rgba(15, 23, 42, 0.45)", 
                                zIndex: 2100, 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center" 
                            }}
                            onClick={() => setShowCompletionPopup(false)}
                        >
                            <div 
                                style={{ 
                                    background: cardBg, 
                                    border: cardBorder,
                                    borderRadius: 16,
                                    padding: "24px 28px",
                                    width: "min(400px, 90vw)",
                                    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)",
                                    fontFamily: "'Segoe UI', system-ui, sans-serif",
                                    animation: "a1-pop .25s ease"
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                    <span style={{ fontWeight: 700, fontSize: 18, color: titleColor, display: "flex", alignItems: "center", gap: 8 }}>
                                        {titleText}
                                    </span>
                                    <button 
                                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: closeColor, fontWeight: 700 }}
                                        onClick={() => setShowCompletionPopup(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <p style={{ margin: "0 0 20px", fontSize: 14.5, color: "#1e293b", lineHeight: 1.5 }}>
                                    {bodyText}
                                </p>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button 
                                        className="a1-btn" 
                                        style={{ 
                                            height: 36, 
                                            fontSize: 13.5, 
                                            fontWeight: 600,
                                            background: btnBg, 
                                            color: "#fff", 
                                            border: "none", 
                                            borderRadius: 8, 
                                            padding: "0 16px", 
                                            cursor: "pointer" 
                                        }}
                                        onClick={() => {
                                            setShowCompletionPopup(false);
                                            setMinimized(false);
                                        }}
                                    >
                                        Maximize & Review
                                    </button>
                                    <button 
                                        className="a1-btn" 
                                        style={{ 
                                            height: 36, 
                                            fontSize: 13.5, 
                                            fontWeight: 600,
                                            background: "#fff", 
                                            color: "#1f2937", 
                                            border: "1px solid #cbd5e1", 
                                            borderRadius: 8, 
                                            padding: "0 16px", 
                                            cursor: "pointer" 
                                        }}
                                        onClick={() => setShowCompletionPopup(false)}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </>
        );
    }

    return (
        <div className="a1-modal-overlay" onClick={handleCloseClick}>
            <style>{`
                @keyframes a1-spin {
                    to { transform: rotate(360deg); }
                }
                .a1-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(22, 53, 92, 0.2);
                    border-top-color: var(--a1-navy);
                    border-radius: 50%;
                    display: inline-block;
                    animation: a1-spin 1s linear infinite;
                }
            `}</style>
            <div
                className="a1-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ width: "min(820px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>
                            <span style={{ marginRight: 8 }}>✨</span>
                            Generate AI Questions
                        </h3>
                        <p className="a1-sub" style={{ marginTop: 4 }}>
                            Powered by Gemini 2.5 Flash · Continuous Pool Generation & Duplicate Elimination
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {(generating || questions.length > 0) && (
                            <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setMinimized(true)}>Minimize</button>
                        )}
                        <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={handleCloseClick}>✕ Close</button>
                    </div>
                </div>
 
                {error && (
                    <div className="a1-banner a1-banner-amber" style={{ marginBottom: 14 }}>
                        ⚠ {error}
                    </div>
                )}
 
                {/* ---- Step 1: Config Form ---- */}
                <form onSubmit={handleGenerate} style={{ display: step === "form" || questions.length > 0 ? "block" : "none" }}>
                    <div className="a1-form-grid" style={{ gap: 14, marginBottom: 14 }}>
                        {/* Target Exam */}
                        <div className="a1-field">
                            <label>Target Exam *</label>
                            {filteredExams.length > 0 ? (
                                <select
                                    required
                                    disabled={generating || questions.length > 0}
                                    value={form.examId}
                                    onChange={(e) => {
                                        const selectedExamId = e.target.value;
                                        setField("examId", selectedExamId);
                                        const matchedExam = filteredExams.find(ex => String(ex.id) === String(selectedExamId));
                                        if (matchedExam) {
                                            setField("stack", matchedExam.stack);
                                            const pSize = matchedExam.questionPoolSize ?? matchedExam.questionPool ?? 50;
                                            const avCount = matchedExam.currentQuestionCount ?? 0;
                                            setField("poolSize", pSize);
                                            setInitialAvailable(avCount);
                                        } else {
                                            setField("poolSize", 50);
                                            setInitialAvailable(0);
                                        }
                                    }}
                                >
                                    <option value="">-- Select Exam --</option>
                                    {filteredExams.map((ex) => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.title}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    required
                                    disabled={generating || questions.length > 0}
                                    placeholder="e.g. Exam UUID"
                                    value={form.examId}
                                    onChange={(e) => {
                                        const selectedExamId = e.target.value;
                                        setField("examId", selectedExamId);
                                    }}
                                />
                            )}
                        </div>

                        {/* Pool Size (Not editable) */}
                        <div className="a1-field">
                            <label>Pool Size</label>
                            <input
                                type="number"
                                disabled
                                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                value={form.poolSize}
                            />
                            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#5C6B82" }}>
                                Defined in Exam settings.
                            </p>
                        </div>

                        {/* Available Questions (Not editable) */}
                        <div className="a1-field">
                            <label>Available Questions</label>
                            <input
                                type="number"
                                disabled
                                style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                value={initialAvailable + questions.length}
                            />
                            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#5C6B82" }}>
                                Existing count ({initialAvailable}) + newly generated ({questions.length}).
                            </p>
                        </div>

                        <div className="a1-field">
                            <label>Technology Stack *</label>
                            <select
                                required
                                disabled={generating || questions.length > 0}
                                value={form.stack}
                                onChange={(e) => setField("stack", e.target.value)}
                            >
                                <option value="">-- Select Stack --</option>
                                {availableStacks.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Difficulty</label>
                            <select 
                                disabled={generating || questions.length > 0}
                                value={form.difficulty} 
                                onChange={(e) => setField("difficulty", e.target.value)}
                            >
                                <option value="NONE">None (Auto-distribute)</option>
                                {DIFFICULTY_OPTIONS.map((d) => {
                                    const label = d === "EASY" ? "Beginner" : d === "MEDIUM" ? "Intermediate" : "Advanced";
                                    return <option key={d} value={d}>{label}</option>;
                                })}
                            </select>
                            {(form.difficulty === "NONE" || !form.difficulty) ? (
                                <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#2d6cdf", fontStyle: "italic" }}>
                                    ✦ Default 50% Easy, 30% Medium, 20% Hard distribution.
                                </p>
                            ) : (
                                <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#b45309", fontStyle: "italic" }}>
                                    ⚡ Override active — all questions will be {form.difficulty === "EASY" ? "Beginner" : form.difficulty === "MEDIUM" ? "Intermediate" : "Advanced"} difficulty.
                                </p>
                            )}
                        </div>
                        <div className="a1-field">
                            <label>Question Type *</label>
                            <select 
                                required 
                                disabled={generating || questions.length > 0}
                                value={form.type} 
                                onChange={(e) => setField("type", e.target.value)}
                            >
                                {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Batch Size (1–10) *</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                required
                                disabled={generating || questions.length > 0}
                                value={form.count}
                                onChange={(e) => setField("count", e.target.value)}
                            />
                            <p style={{ margin: "5px 0 0", fontSize: 11, color: "#5C6B82" }}>
                                Questions requested per batch/generation.
                            </p>
                        </div>
                    </div>
                    <div className="a1-field" style={{ marginBottom: 18 }}>
                        <label>Topic / Prompt guidance (optional)</label>
                        <input
                            disabled={generating || questions.length > 0}
                            placeholder="e.g. 'Focus on Spring Boot JPA relationships'"
                            value={form.topic}
                            onChange={(e) => setField("topic", e.target.value)}
                        />
                    </div>
                    {questions.length === 0 && !generating && (
                        <div className="a1-modal-actions">
                            <button type="button" className="a1-btn a1-btn-ghost" onClick={handleCloseClick}>Cancel</button>
                            <button type="submit" className="a1-btn a1-btn-primary">✨ Generate Questions</button>
                        </div>
                    )}
                </form>

                {/* ---- Step 2: Continuous Generation Progress & Preview ---- */}
                {(generating || questions.length > 0) && (
                    <div style={{ marginTop: 18 }}>
                        {/* Progress Bar & Stats Banner */}
                        <div className="a1-banner a1-banner-navy" style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>
                                    <strong>Pool Size Status:</strong> {initialAvailable + questions.length} / {form.poolSize} Questions (Available / Pool Size)
                                </span>
                                {generating ? (
                                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="a1-spinner" />
                                        <span style={{ fontSize: 12.5 }}>Generating repeatedly...</span>
                                        <button type="button" className="a1-btn a1-btn-red a1-btn-sm" style={{ padding: "2px 8px", height: 26 }} onClick={handleStopGeneration}>
                                            Stop
                                        </button>
                                        <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" style={{ padding: "2px 8px", height: 26 }} onClick={() => setMinimized(true)}>
                                            Minimize
                                        </button>
                                    </span>
                                ) : (initialAvailable + questions.length) >= form.poolSize ? (
                                    <span style={{ color: "var(--a1-green)", fontWeight: 700 }}>✓ Pool Reached</span>
                                ) : error ? (
                                    <span style={{ color: "var(--a1-red)", fontWeight: 700 }}>✕ Generation Failed</span>
                                ) : (
                                    <span style={{ color: "var(--a1-amber)", fontWeight: 700 }}>⚠ Stopped</span>
                                )}
                            </div>
                            <div style={{ width: "100%", background: "rgba(255,255,255,0.3)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                                <div 
                                    style={{ 
                                        width: `${Math.min(100, ((initialAvailable + questions.length) / form.poolSize) * 100)}%`, 
                                        background: "var(--a1-navy)", 
                                        height: "100%", 
                                        transition: "width 0.3s ease" 
                                    }} 
                                />
                            </div>
                            {duplicateCount > 0 && (
                                <span style={{ fontSize: 12, opacity: 0.85 }}>
                                    ℹ️ {duplicateCount} duplicate question{duplicateCount !== 1 ? "s" : ""} were automatically filtered out & deleted.
                                </span>
                            )}
                        </div>

                        {/* Pool Size Reached Action Panel */}
                        {!generating && (initialAvailable + questions.length) >= form.poolSize && (
                            <div 
                                className="a1-banner a1-banner-amber" 
                                style={{ 
                                    marginBottom: 16, 
                                    display: "flex", 
                                    flexDirection: "column", 
                                    gap: 12,
                                    border: "1.5px solid var(--a1-amber)"
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    🎯 Target pool size reached ({initialAvailable + questions.length} questions available). Select next action:
                                </div>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <button
                                        type="button"
                                        className="a1-btn a1-btn-sm"
                                        style={{ background: "#475569", color: "#fff", border: "none" }}
                                        onClick={() => setShowConfirm("generate_more")}
                                    >
                                        ➕ Generate 10 More
                                    </button>
                                    <button
                                        type="button"
                                        className="a1-btn a1-btn-sm a1-btn-primary"
                                        onClick={() => setShowConfirm("approve_save")}
                                    >
                                        ✓ Approve & Save
                                    </button>
                                    <button
                                        type="button"
                                        className="a1-btn a1-btn-sm a1-btn-red"
                                        onClick={() => setShowConfirm("cancel")}
                                    >
                                        ✕ Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Preview Questions Cards */}
                        {questions.length === 0 && !generating && (
                            <div className="a1-empty">All questions deleted. Reset form and try again.</div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
                            {questions.map((q, idx) => (
                                <QuestionPreviewCard
                                    key={q.tempId || idx}
                                    question={q}
                                    idx={idx}
                                    exams={filteredExams}
                                    isEditing={editingIdx === idx}
                                    isRegenerating={regeneratingIdx === idx}
                                    disabled={step === "saving"}
                                    onEdit={() => setEditingIdx(editingIdx === idx ? null : idx)}
                                    onDelete={() => deleteQuestion(idx)}
                                    onRegenerate={() => handleRegenerate(idx)}
                                    onChange={(field, value) => updateQuestion(idx, field, value)}
                                    onDoneEdit={() => setEditingIdx(null)}
                                />
                            ))}
                        </div>

                        {/* Bottom Actions Row when NOT generating */}
                        {!generating && (
                            <div className="a1-modal-actions" style={{ marginTop: 20, justifyContent: "space-between" }}>
                                <button 
                                    type="button" 
                                    className="a1-btn a1-btn-ghost" 
                                    onClick={() => setShowConfirm("clear_start_over")}
                                >
                                    ← Clear & Start Over
                                </button>
                                <div style={{ display: "flex", gap: 10 }}>
                                    <button 
                                        type="button" 
                                        className="a1-btn a1-btn-ghost" 
                                        onClick={() => setShowConfirm("cancel")}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="a1-btn a1-btn-primary"
                                        disabled={questions.length === 0 || step === "saving"}
                                        onClick={() => setShowConfirm("approve_save")}
                                    >
                                        {step === "saving" ? "Saving…" : `✓ Approve & Save ${questions.length} Question${questions.length !== 1 ? "s" : ""}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Inner Confirmation Dialog Modal Overlay */}
                {showConfirm && (
                    <div className="a1-modal-overlay" style={{ background: "rgba(14, 22, 34, 0.65)", zIndex: 1100 }}>
                        <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(400px, 90vw)", padding: "20px 24px", textAlign: "center" }}>
                            <h4 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "var(--a1-navy)" }}>Confirm Action</h4>
                            <p style={{ margin: "0 0 20px", fontSize: 13.5, color: "var(--a1-mut)", lineHeight: 1.5 }}>
                                {showConfirm === "generate_more" && "Are you sure you want to generate 10 more questions?"}
                                {showConfirm === "approve_save" && `Are you sure you want to approve and save these ${questions.length} question(s) to the question bank?`}
                                {showConfirm === "cancel" && "Are you sure you want to cancel? Any unsaved generated questions will be discarded."}
                                {showConfirm === "clear_start_over" && "Are you sure you want to clear all generated questions and start over with a fresh configuration?"}
                            </p>
                            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                                <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setShowConfirm(null)}>
                                    Go Back
                                </button>
                                <button
                                    type="button"
                                    className={`a1-btn a1-btn-sm ${showConfirm === "cancel" || showConfirm === "clear_start_over" ? "a1-btn-red" : "a1-btn-primary"}`}
                                    onClick={handleConfirmAction}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---- Preview Card ----
function QuestionPreviewCard({ question, idx, exams = [], isEditing, isRegenerating, disabled, onEdit, onDelete, onRegenerate, onChange, onDoneEdit }) {
    const assignedExam = exams.find(e => String(e.id || e.examId) === String(question.examId));
    const assignedExamName = assignedExam ? assignedExam.title : "Unassigned";
    const diffUpper = question.difficulty ? question.difficulty.toUpperCase() : "MEDIUM";
    const displayDiff = diffUpper === "EASY" ? "Beginner" : diffUpper === "MEDIUM" ? "Intermediate" : "Advanced";
    
    return (
        <div
            className="a1-card"
            style={{
                padding: "16px 18px",
                borderLeft: "4px solid var(--a1-navy)",
                opacity: isRegenerating ? 0.6 : 1,
                transition: "opacity .2s",
            }}
        >
            {/* Card header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="a1-pill">{question.stack}</span>
                    <span className="a1-pill a1-pill-amber">{displayDiff}</span>
                    <span className="a1-pill a1-pill-navy">{question.type}</span>
                    <span className="a1-pill a1-pill-green">AI · {question.aiModel || "Gemini"}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onEdit} disabled={disabled}>
                        {isEditing ? "Done" : "Edit"}
                    </button>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onRegenerate} disabled={disabled || isRegenerating}>
                        {isRegenerating ? "…" : "↻ Regen"}
                    </button>
                    <button className="a1-btn a1-btn-red a1-btn-sm" onClick={onDelete} disabled={disabled}>✕</button>
                </div>
            </div>

            {/* Question text */}
            {isEditing ? (
                <textarea
                    className="a1-textarea"
                    value={question.questionText}
                    onChange={(e) => onChange("questionText", e.target.value)}
                    style={{ marginBottom: 10, minHeight: 72 }}
                />
            ) : (
                <p style={{ margin: "0 0 10px", fontSize: 14, lineHeight: 1.55, fontWeight: 500 }}>
                    Q{idx + 1}. {question.questionText}
                </p>
            )}

            {/* Code snippet */}
            {(question.codeSnippet || isEditing) && (
                <div style={{ marginBottom: 10 }}>
                    {isEditing ? (
                        <textarea
                            className="a1-textarea a1-mono"
                            placeholder="Code snippet (optional)…"
                            value={question.codeSnippet || ""}
                            onChange={(e) => onChange("codeSnippet", e.target.value)}
                            style={{ minHeight: 60, fontSize: 12 }}
                        />
                    ) : (
                        question.codeSnippet && (
                            <pre className="a1-mono" style={{
                                background: "#f1f5f9", border: "1px solid var(--a1-line)",
                                borderRadius: 6, padding: "8px 12px", fontSize: 12,
                                overflowX: "auto", whiteSpace: "pre-wrap"
                            }}>
                                {question.codeSnippet}
                            </pre>
                        )
                    )}
                </div>
            )}

            {/* Options grid */}
            <div className="a1-form-grid" style={{ gap: 8 }}>
                {["A", "B", "C", "D"].map((opt) => {
                    const field = `option${opt}`;
                    const isCorrect = question.correctOption === opt;
                    return (
                        <div
                            key={opt}
                            style={{
                                border: `1.5px solid ${isCorrect ? "var(--a1-green)" : "var(--a1-line)"}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                background: isCorrect ? "var(--a1-green-soft)" : "#fff",
                                fontSize: 13,
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isEditing ? 4 : 0 }}>
                                <span style={{ fontWeight: 700, color: isCorrect ? "var(--a1-green)" : "var(--a1-mut)" }}>
                                    {opt}{isCorrect ? " ✓" : ""}
                                </span>
                                {isEditing && (
                                    <button
                                        className="a1-btn a1-btn-ghost a1-btn-sm"
                                        style={{ padding: "2px 6px", fontSize: 11 }}
                                        onClick={() => onChange("correctOption", opt)}
                                        type="button"
                                    >
                                        {isCorrect ? "Correct" : "Set correct"}
                                    </button>
                                )}
                            </div>
                            {isEditing ? (
                                <input
                                    className="a1-field"
                                    style={{ border: "none", padding: 0, fontSize: 13, width: "100%", background: "transparent" }}
                                    value={question[field] || ""}
                                    onChange={(e) => onChange(field, e.target.value)}
                                />
                            ) : (
                                <span>{question[field]}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Marks */}
            {isEditing && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <label className="a1-sub" style={{ fontWeight: 600 }}>Marks:</label>
                    <input
                        type="number"
                        min={1}
                        max={5}
                        value={question.marks || 1}
                        onChange={(e) => onChange("marks", Number(e.target.value))}
                        style={{ width: 60, border: "1px solid var(--a1-line)", borderRadius: 6, padding: "4px 8px", fontSize: 13 }}
                    />
                </div>
            )}
        </div>
    );
}
