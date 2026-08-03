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

import React, { useState } from "react";
import { generateAIQuestions, saveAIQuestions, regenerateAIQuestion, META } from "./api";
import "./a1.css";

const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];

const DEFAULT_FORM = {
    stack: META.STACKS[0],
    level: "L3",
    difficulty: "MEDIUM",
    type: "MCQ",
    count: 5,
    topic: "",
    examId: "",
};

const LEVEL_LABELS = { L1: "L1 · Beginner", L2: "L2 · Elementary", L3: "L3 · Intermediate", L4: "L4 · Advanced", L5: "L5 · Expert" };

export default function AIQuestionGenerator({ examId, exams = [], onClose, onSaved }) {
    const [step, setStep] = useState("form"); // "form" | "preview" | "saving"
    const [form, setForm] = useState({ ...DEFAULT_FORM, examId: examId || (exams[0]?.id || "") });
    const [questions, setQuestions] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [regeneratingIdx, setRegeneratingIdx] = useState(null);
    const [editingIdx, setEditingIdx] = useState(null);

    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // ---- Step 1: Generate ----
    const handleGenerate = async (e) => {
        e.preventDefault();
        setError(null);
        setGenerating(true);
        try {
            const payload = {
                stack: form.stack,
                level: form.level,
                difficulty: form.difficulty,
                type: form.type,
                count: Number(form.count),
                topic: form.topic || null,
                examId: form.examId || null,
            };
            const result = await generateAIQuestions(payload);
            setQuestions(result);
            setStep("preview");
        } catch (err) {
            setError(err.message || "Generation failed. Check your Gemini API key.");
        } finally {
            setGenerating(false);
        }
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

    return (
        <div className="a1-modal-overlay" onClick={onClose}>
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
                            Powered by Gemini 2.5 Flash · Preview and edit before saving
                        </p>
                    </div>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onClose}>✕ Close</button>
                </div>

                {error && (
                    <div className="a1-banner a1-banner-amber" style={{ marginBottom: 14 }}>
                        ⚠ {error}
                    </div>
                )}

                {/* ---- Step 1: Config Form ---- */}
                {step === "form" && (
                    <form onSubmit={handleGenerate}>
                        <div className="a1-form-grid" style={{ gap: 14, marginBottom: 14 }}>
                            <div className="a1-field">
                                <label>Technology Stack</label>
                                <select value={form.stack} onChange={(e) => setField("stack", e.target.value)}>
                                    {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Difficulty Level</label>
                                <select value={form.level} onChange={(e) => setField("level", e.target.value)}>
                                    {META.LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Difficulty Tag</label>
                                <select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}>
                                    {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Question Type</label>
                                <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                                    {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Number of Questions (1–10)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={form.count}
                                    onChange={(e) => setField("count", e.target.value)}
                                />
                            </div>
                            <div className="a1-field">
                                <label>Target Exam</label>
                                {exams.length > 0 ? (
                                    <select value={form.examId} onChange={(e) => setField("examId", e.target.value)}>
                                        <option value="">-- Select Exam --</option>
                                        {exams.map((ex) => (
                                            <option key={ex.id} value={ex.id}>
                                                {ex.title} ({ex.stack})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        placeholder="e.g. Exam UUID or leave blank"
                                        value={form.examId}
                                        onChange={(e) => setField("examId", e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="a1-field" style={{ marginBottom: 18 }}>
                            <label>Topic / Prompt guidance (optional)</label>
                            <input
                                placeholder="e.g. 'Focus on Spring Boot JPA relationships'"
                                value={form.topic}
                                onChange={(e) => setField("topic", e.target.value)}
                            />
                        </div>
                        <div className="a1-modal-actions">
                            <button type="button" className="a1-btn a1-btn-ghost" onClick={onClose}>Cancel</button>
                            <button className="a1-btn a1-btn-primary" disabled={generating}>
                                {generating ? "⏳ Generating…" : "✨ Generate"}
                            </button>
                        </div>
                    </form>
                )}

                {/* ---- Step 2: Preview ---- */}
                {(step === "preview" || step === "saving") && (
                    <>
                        <div className="a1-banner a1-banner-navy" style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span>
                                <strong>{questions.length}</strong> question{questions.length !== 1 ? "s" : ""} generated.
                                Edit, delete, or regenerate before saving.
                            </span>
                            <button
                                className="a1-btn a1-btn-ghost a1-btn-sm"
                                onClick={() => setStep("form")}
                                disabled={step === "saving"}
                            >
                                ← Regenerate All
                            </button>
                        </div>

                        {questions.length === 0 && (
                            <div className="a1-empty">All questions deleted. Go back and regenerate.</div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {questions.map((q, idx) => (
                                <QuestionPreviewCard
                                    key={q.tempId || idx}
                                    question={q}
                                    idx={idx}
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

                        <div className="a1-modal-actions" style={{ marginTop: 20 }}>
                            <button className="a1-btn a1-btn-ghost" onClick={() => setStep("form")} disabled={step === "saving"}>
                                ← Back
                            </button>
                            <button
                                className="a1-btn a1-btn-primary"
                                disabled={questions.length === 0 || step === "saving"}
                                onClick={handleSave}
                            >
                                {step === "saving" ? "Saving…" : `✓ Approve & Save ${questions.length} Question${questions.length !== 1 ? "s" : ""}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ---- Preview Card ----
function QuestionPreviewCard({ question, idx, isEditing, isRegenerating, disabled, onEdit, onDelete, onRegenerate, onChange, onDoneEdit }) {
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="a1-pill">{question.stack}</span>
                    <span className={`a1-pill a1-lvl-${question.level}`}>{question.level}</span>
                    <span className="a1-pill a1-pill-amber">{question.difficulty}</span>
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
