// A1 · Task 4 — Question Bank
// Full Question Authoring & Management (Manual & AI):
//   - Full question editor with MCQ (Radio buttons for correct answer selection),
//     Coding (starter code, sample inputs/outputs, language), and Descriptive (model answer).
//   - Rich Question Viewer modal with full answer key & metadata.
//   - Search, Filter by Stack/Type/Level/Status, Bulk Actions, and Gemini AI Generation integration.

import React, { useEffect, useMemo, useState } from "react";
import {
    fetchQuestions, fetchExams, createQuestion, updateQuestion, deleteQuestion, bulkUpdateQuestions, bulkDeleteQuestions, META,
} from "../services/api";
import "../components/a1.css";

const PAGE_SIZE = 10;
const TYPE_LABEL = { MCQ: "MCQ", CODING: "Coding", DESCRIPTIVE: "Descriptive" };
const DIFFICULTY_OPTIONS = ["EASY", "MEDIUM", "HARD"];
const LANGUAGE_OPTIONS = ["Java", "JavaScript", "Python", "SQL", "C++"];

const emptyQuestion = {
    examId: "",
    questionText: "",
    stack: META.STACKS[0],
    topic: "",
    type: "MCQ",
    level: "L1",
    difficulty: "EASY",
    marks: 1,
    status: "ACTIVE",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A",
    codeSnippet: "",
    language: "Java",
    sampleInput: "",
    sampleOutput: "",
    expectedOutput: "",
    modelAnswer: "",
    explanation: "",
};

export default function QuestionBankPage() {
    const [rows, setRows] = useState(null);
    const [exams, setExams] = useState([]);
    const [filters, setFilters] = useState({ examId: "", stack: "", type: "", difficulty: "", status: "" });
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const [editing, setEditing] = useState(null); // question object or {} for new
    const [viewing, setViewing] = useState(null); // question object to view details
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [aiSavedToast, setAiSavedToast] = useState(null);
    const [showQuestionsManager, setShowQuestionsManager] = useState(false);
    const [examSelectWarning, setExamSelectWarning] = useState(false);

    const availableStacks = useMemo(() => {
        const customStacks = exams.map((e) => e.stack).filter(Boolean);
        return Array.from(new Set([...META.STACKS, ...customStacks]));
    }, [exams]);

    const load = (currentFilters = filters) => {
        fetchQuestions(currentFilters).then((res) => setRows(res?.rows || (Array.isArray(res) ? res : [])));
        fetchExams().then((res) => {
            const list = res?.rows || (Array.isArray(res) ? res : []);
            const filtered = list.filter((ex) => {
                if (!ex.id) return false;
                const idStr = ex.id.toString();
                const titleStr = (ex.title || "").toString();
                return !idStr.startsWith("17") && !titleStr.includes("17");
            });
            setExams(filtered);
        });
    };

    useEffect(() => {
        load();
        setSelected(new Set());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        const handleSaved = (e) => {
            setAiSavedToast(e.detail.count);
            load();
        };
        window.addEventListener('ai-generator-saved', handleSaved);
        return () => window.removeEventListener('ai-generator-saved', handleSaved);
    }, []);

    const filteredRows = useMemo(() => {
        if (!rows) return [];
        let result = rows;
        if (filters.examId) {
            const selectedExam = exams.find((e) => String(e.id || e.examId) === String(filters.examId));
            result = result.filter((q) => {
                const qExamId = q.examId || q.exam?.id || q.exam_id;
                if (qExamId) return String(qExamId) === String(filters.examId);
                if (selectedExam) {
                    const title = q.examTitle || q.examName || (typeof q.exam === "string" ? q.exam : q.exam?.title);
                    if (title) return title === selectedExam.title;
                    return q.stack === selectedExam.stack;
                }
                return false;
            });
        }
        if (filters.stack) result = result.filter((q) => q.stack === filters.stack);
        if (filters.type) result = result.filter((q) => q.type === filters.type);
        if (filters.difficulty) result = result.filter((q) => (q.difficulty || "").toUpperCase() === filters.difficulty.toUpperCase());
        if (filters.status) result = result.filter((q) => q.status === filters.status);
        return result;
    }, [rows, filters, exams]);

    const pageRows = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredRows.slice(start, start + PAGE_SIZE);
    }, [filteredRows, page]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
    const activeCount = filteredRows.filter((q) => q.status === "ACTIVE").length;

    const toggleSelect = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const toggleSelectAllPage = () =>
        setSelected((prev) => {
            const allOnPage = pageRows.every((q) => prev.has(q.id));
            const next = new Set(prev);
            pageRows.forEach((q) => (allOnPage ? next.delete(q.id) : next.add(q.id)));
            return next;
        });

    const saveQuestion = async (payload) => {
        if (editing?.id) await updateQuestion(editing.id, payload);
        else await createQuestion(payload);
        setEditing(null);
        load();
    };

    const doDelete = async () => {
        await deleteQuestion(confirmDelete.id);
        setConfirmDelete(null);
        load();
    };

    const bulkSetStatus = async (status) => {
        await bulkUpdateQuestions([...selected], { status });
        setSelected(new Set());
        load();
    };

    const bulkDelete = async () => {
        await Promise.all([...selected].map((id) => deleteQuestion(id)));
        setSelected(new Set());
        load();
    };


    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Question Bank</h1>
                    <p className="a1-sub">Create, author, and manage the question pool that certification exams draw from.</p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    
                    <button
                        className="a1-btn a1-btn-ghost"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-ai-generator', {
                                detail: { exams }
                            }));
                        }}
                        style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a9e 100%)", color: "#fff", border: "none" }}
                    >
                        ✨ Generate AI Questions
                    </button>
                    <button className="a1-btn a1-btn-primary" onClick={() => setEditing({ ...emptyQuestion })}>
                        + Create Question
                    </button>
                </div>
            </header>

            {aiSavedToast && (
                <div className="a1-banner a1-banner-green" style={{ marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>✓ {aiSavedToast} AI-generated question{aiSavedToast !== 1 ? "s" : ""} saved to the bank.</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setAiSavedToast(null)}>✕</button>
                </div>
            )}

            <div className="a1-pool-note">
                Example: Question Pool = 120 · Per Attempt = 30 · Minimum Required Questions = 30.
                {rows && ` Active questions matching current filters: ${activeCount} of ${filteredRows.length}.`}
            </div>

            {/* Filter bar */}
            <div className="a1-filterbar" style={{ marginTop: 18 }}>
                <div className="a1-field">
                    <label>Assigned Exam</label>
                    <select value={filters.examId} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, examId: e.target.value })); }}>
                        <option value="">All Exams</option>
                        {exams.map((ex) => (
                            <option key={ex.id} value={ex.id}>{ex.title}</option>
                        ))}
                    </select>
                </div>
                <div className="a1-field">
                    <label>Type</label>
                    <select value={filters.type} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, type: e.target.value })); }}>
                        <option value="">All types</option>
                        {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                </div>
                <div className="a1-field">
                    <label>Difficulty</label>
                    <select value={filters.difficulty} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, difficulty: e.target.value })); }}>
                        <option value="">All</option>
                        <option value="EASY">Beginner</option>
                        <option value="MEDIUM">Intermediate</option>
                        <option value="HARD">Advanced</option>
                    </select>
                </div>
                <div className="a1-field">
                    <label>Status</label>
                    <select value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
                        <option value="">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
                <button
                    type="button"
                    className="a1-btn a1-btn-view-qa"
                    style={{ whiteSpace: "nowrap", height: "36px", padding: "0 16px", display: "flex", alignItems: "center" }}
                    onClick={() => {
                        if (!filters.examId) {
                            setExamSelectWarning(true);
                            return;
                        }
                        setShowQuestionsManager(true);
                    }}
                >
                    View All QA's
                </button>
            </div>

            {/* Questions Table */}
            {!rows ? (
                <div className="a1-loading">Loading questions…</div>
            ) : filteredRows.length === 0 ? (
                <div className="a1-empty">No questions match your filters.</div>
            ) : (
                <div className="a1-table-container">
                    <table className="a1-table a1-table-hover">
                        <thead>
                            <tr>
                                <th style={{ textAlign: "center" }}>Question</th>
                                <th style={{ textAlign: "left" }}>Assigned Exam</th>
                                <th style={{ textAlign: "left" }}>Stack</th>
                                <th style={{ textAlign: "center" }}>Type</th>
                                <th style={{ textAlign: "center" }}>Difficulty</th>
                                <th style={{ textAlign: "center" }}>Source</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map((q) => {
                                const assignedExamTitle =
                                    q.exam?.title ||
                                    q.examTitle ||
                                    q.examName ||
                                    (typeof q.exam === "string" && q.exam.trim() ? q.exam : null) ||
                                    (exams.find((e) => String(e.id || e.examId) === String(q.examId || q.exam?.id || q.exam_id) || e.title === q.exam || e.title === q.examTitle)?.title) ||
                                    "Unassigned";
                                const diffUpper = q.difficulty ? q.difficulty.toUpperCase() : "MEDIUM";
                                const displayDiff = diffUpper === "EASY" ? "Beginner" : diffUpper === "MEDIUM" ? "Intermediate" : "Advanced";
                                return (
                                    <tr key={q.id}>
                                        <td style={{ textAlign: "center" }}>
                                            <button 
                                                className="a1-btn" 
                                                style={{ 
                                                    background: "none", 
                                                    border: "none", 
                                                    color: "var(--a1-navy)", 
                                                    fontWeight: 600, 
                                                    textDecoration: "underline", 
                                                    cursor: "pointer", 
                                                    padding: 0,
                                                    fontSize: "13px"
                                                }}
                                                onClick={() => setViewing(q)}
                                            >
                                                View Question
                                            </button>
                                        </td>
                                        <td style={{ textAlign: "left" }}>
                                            <span className="a1-pill a1-pill-navy" style={{ fontWeight: 600 }}>
                                                {assignedExamTitle}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "left" }}>{q.stack}</td>
                                        <td style={{ textAlign: "center" }}><span className="a1-pill a1-pill-navy">{TYPE_LABEL[q.type] || q.type}</span></td>
                                        <td style={{ textAlign: "center" }}>
                                            <span className="a1-pill a1-pill-amber">
                                                {displayDiff}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <span className={`a1-pill ${q.source === "AI" ? "a1-pill-green" : "a1-pill"}`}>
                                                {q.source || "MANUAL"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <span className={`a1-pill ${q.status === "ACTIVE" ? "a1-pill-green" : ""}`}>{q.status}</span>
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                                <button 
                                                    className="a1-btn a1-btn-ghost a1-btn-sm" 
                                                    style={{ padding: "6px" }} 
                                                    onClick={() => setEditing(q)} 
                                                    title="Edit Question"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    className="a1-btn a1-btn-ghost a1-btn-sm" 
                                                    style={{ padding: "6px", color: "var(--a1-red)" }} 
                                                    onClick={() => setConfirmDelete(q)} 
                                                    title="Delete Question"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        <line x1="10" y1="11" x2="10" y2="17" />
                                                        <line x1="14" y1="11" x2="14" y2="17" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {filteredRows && filteredRows.length > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span className="a1-sub">Page {page} of {totalPages}</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
            )}



            {/* Create / Edit Question Modal */}
            {editing && (
                <QuestionModal
                    question={editing}
                    exams={exams}
                    onCancel={() => setEditing(null)}
                    onSave={saveQuestion}
                />
            )}

            {/* View Question Details Modal */}
            {viewing && (
                <ViewQuestionModal
                    question={viewing}
                    onClose={() => setViewing(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="a1-modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete question?</h3>
                        <p className="a1-sub">"{confirmDelete.questionText || confirmDelete.title}" will be permanently removed from the bank.</p>
                        <div className="a1-modal-actions">
                            <button className="a1-btn a1-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="a1-btn a1-btn-red" onClick={doDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {examSelectWarning && (
                <div className="a1-modal-overlay" onClick={() => setExamSelectWarning(false)}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)", borderRadius: "16px", padding: "24px" }}>
                        <h3 style={{ fontSize: "19px", fontWeight: 700, color: "var(--a1-navy)", margin: "0 0 10px 0" }}>Select an Exam First</h3>
                        <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--a1-mut)", margin: "0 0 20px 0" }}>
                            Please select an Assigned Exam from the filter dropdown above to view all matching questions for that exam.
                        </p>
                        <div className="a1-modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button className="a1-btn a1-btn-primary" onClick={() => setExamSelectWarning(false)} style={{ borderRadius: "10px", padding: "8px 20px" }}>
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showQuestionsManager && (
                <QuestionsManagementModal
                    filters={filters}
                    exams={exams}
                    onClose={() => setShowQuestionsManager(false)}
                    onRefresh={load}
                />
            )}
        </div>
    );
}

// ============================================================
// Comprehensive Dynamic Question Modal (Create / Edit)
// Supports MCQ (Options A-D with Radio Button Selection),
// Coding (Starter Code, Inputs/Outputs), and Descriptive types.
// ============================================================
function QuestionModal({ question, exams = [], onCancel, onSave }) {
    const availableStacks = React.useMemo(() => {
        const customStacks = exams.map((e) => e.stack).filter(Boolean);
        return Array.from(new Set([...META.STACKS, ...customStacks]));
    }, [exams]);

    const [form, setForm] = useState({
        examId: question.exam?.id || question.examId || (exams[0]?.id || ""),
        questionText: question.questionText || question.title || "",
        stack: question.stack || META.STACKS[0],
        type: question.type || "MCQ",
        difficulty: question.difficulty || "EASY",

        // MCQ
        optionA: question.optionA || "",
        optionB: question.optionB || "",
        optionC: question.optionC || "",
        optionD: question.optionD || "",
        correctOption: question.correctOption || "A",
    });
    const [busy, setBusy] = useState(false);

    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const selectedExam = exams.find((e) => String(e.id) === String(form.examId));
            await onSave({
                ...question,
                ...form,
                examId: form.examId || null,
                examTitle: selectedExam?.title || null,
                exam: form.examId ? { id: form.examId, title: selectedExam?.title } : null,
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="a1-modal-overlay" onClick={onCancel}>
            <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0 }}>{question.id ? "Edit Question" : "Create New Question"}</h3>
                    <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onCancel}>✕</button>
                </div>

                <form onSubmit={submit}>
                    {/* Common Header Fields */}
                    <div className="a1-form-grid" style={{ marginBottom: 12 }}>
                        <div className="a1-field" style={{ gridColumn: "span 2" }}>
                            <label>Target Exam *</label>
                            <select
                                required
                                value={form.examId}
                                onChange={(e) => setField("examId", e.target.value)}
                            >
                                <option value="">-- Select Exam --</option>
                                {exams.map((ex) => (
                                    <option key={ex.id} value={ex.id}>
                                        {ex.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Technology Stack *</label>
                            <select value={form.stack} onChange={(e) => setField("stack", e.target.value)}>
                                {availableStacks.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Question Type *</label>
                            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                                {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Difficulty *</label>
                            <select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}>
                                {DIFFICULTY_OPTIONS.map((d) => {
                                    const label = d === "EASY" ? "Beginner" : d === "MEDIUM" ? "Intermediate" : "Advanced";
                                    return <option key={d} value={d}>{label}</option>;
                                })}
                            </select>
                        </div>
                    </div>

                    {/* Question Text */}
                    <div className="a1-field" style={{ marginBottom: 16 }}>
                        <label>Question Text *</label>
                        <textarea
                            className="a1-textarea"
                            required
                            placeholder="Enter the full question prompt..."
                            value={form.questionText}
                            onChange={(e) => setField("questionText", e.target.value)}
                            style={{ 
                                minHeight: "180px", 
                                fontSize: "14px", 
                                lineHeight: "1.6", 
                                padding: "12px 14px", 
                                width: "100%", 
                                boxSizing: "border-box" 
                            }}
                        />
                    </div>

                    {/* MCQ Options Display */}
                    {form.type === "MCQ" && (
                        <div style={{ background: "#f8fafc", border: "1px solid var(--a1-line)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--a1-navy)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                                <span>MCQ Options (Select the Radio Button for the Correct Answer)</span>
                                <span className="a1-sub">Correct Answer: <strong>Option {form.correctOption}</strong></span>
                            </div>

                            {["A", "B", "C", "D"].map((opt) => {
                                const isSelected = form.correctOption === opt;
                                const fieldKey = `option${opt}`;
                                return (
                                    <div
                                        key={opt}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "8px 12px",
                                            marginBottom: 8,
                                            borderRadius: 8,
                                            border: `1.5px solid ${isSelected ? "var(--a1-green)" : "var(--a1-line)"}`,
                                            background: isSelected ? "var(--a1-green-soft)" : "#fff",
                                            transition: "all .15s",
                                        }}
                                    >
                                        <label
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                                cursor: "pointer",
                                                fontWeight: 700,
                                                color: isSelected ? "var(--a1-green)" : "var(--a1-ink)",
                                                userSelect: "none",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="correctOptionRadio"
                                                checked={isSelected}
                                                onChange={() => setField("correctOption", opt)}
                                                style={{ width: 16, height: 16, accentColor: "var(--a1-green)", cursor: "pointer" }}
                                            />
                                            Option {opt}
                                        </label>
                                        <input
                                            required
                                            style={{ flex: 1, border: "1px solid var(--a1-line)", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}
                                            placeholder={`Enter content for Option ${opt}...`}
                                            value={form[fieldKey]}
                                            onChange={(e) => setField(fieldKey, e.target.value)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="a1-modal-actions">
                        <button type="button" className="a1-btn a1-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                        <button className="a1-btn a1-btn-primary" disabled={busy}>
                            {busy ? "Saving…" : "Save Question"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================
// View Question Details Modal
// Renders complete question with options, code snippets, model answers
// ============================================================
function ViewQuestionModal({ question, onClose }) {
    return (
        <div className="a1-modal-overlay" onClick={onClose}>
            <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 95vw)", maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ margin: 0 }}>Question Details</h3>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onClose}>✕</button>
                </div>

                {/* Question Prompt */}
                <div className="a1-card" style={{ padding: 16, background: "#f8fafc", marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.5, color: "var(--a1-navy)" }}>
                        {question.questionText || question.title}
                    </div>
                </div>

                {/* MCQ Options Display */}
                {question.type === "MCQ" && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--a1-navy)", marginBottom: 8 }}>
                            Options & Answer Key
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {["A", "B", "C", "D"].map((opt) => {
                                const isCorrect = question.correctOption === opt;
                                const fieldKey = `option${opt}`;
                                const text = question[fieldKey];
                                if (!text) return null;
                                return (
                                    <div
                                        key={opt}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            padding: "10px 12px",
                                            borderRadius: 8,
                                            border: `1.5px solid ${isCorrect ? "var(--a1-green)" : "var(--a1-line)"}`,
                                            background: isCorrect ? "var(--a1-green-soft)" : "#fff",
                                            fontSize: 13.5,
                                        }}
                                    >
                                        <span style={{
                                            fontWeight: 700,
                                            color: isCorrect ? "var(--a1-green)" : "var(--a1-mut)",
                                            minWidth: "40px",
                                            whiteSpace: "nowrap",
                                        }}>
                                            {isCorrect ? `(● ${opt})` : `(${opt})`}
                                        </span>
                                        <span style={{ flex: 1 }}>{text}</span>
                                        {isCorrect && <span style={{ fontWeight: 700, color: "var(--a1-green)", fontSize: 12 }}>✓ Correct Answer</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Coding Details Display */}
                {question.type === "CODING" && (
                    <div style={{ marginBottom: 14 }}>
                        {question.codeSnippet && (
                            <div style={{ marginBottom: 10 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Starter Code ({question.language || "Java"})</div>
                                <pre className="a1-mono" style={{ background: "#0f172a", color: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 12.5, overflowX: "auto" }}>
                                    {question.codeSnippet}
                                </pre>
                            </div>
                        )}
                        {(question.sampleInput || question.sampleOutput) && (
                            <div className="a1-form-grid" style={{ marginBottom: 10 }}>
                                {question.sampleInput && (
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Sample Input</div>
                                        <pre className="a1-mono" style={{ background: "#f1f5f9", padding: 8, borderRadius: 6, fontSize: 12 }}>{question.sampleInput}</pre>
                                    </div>
                                )}
                                {question.sampleOutput && (
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Sample Output</div>
                                        <pre className="a1-mono" style={{ background: "#f1f5f9", padding: 8, borderRadius: 6, fontSize: 12 }}>{question.sampleOutput}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Descriptive Details Display */}
                {question.type === "DESCRIPTIVE" && question.modelAnswer && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Model Answer / Evaluation Criteria</div>
                        <div style={{ background: "#f8fafc", border: "1px solid var(--a1-line)", borderRadius: 8, padding: 12, fontSize: 13, lineHeight: 1.5 }}>
                            {question.modelAnswer}
                        </div>
                    </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Explanation / Rationale</div>
                        <div className="a1-banner a1-banner-navy" style={{ marginBottom: 0 }}>
                            {question.explanation}
                        </div>
                    </div>
                )}

                <div className="a1-modal-actions">
                    <button className="a1-btn a1-btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function QuestionsManagementModal({ filters, exams = [], onClose, onRefresh }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'ACTIVE' | 'INACTIVE' | 'DELETE', count: number }
    const [actionBusy, setActionBusy] = useState(false);

    const loadQuestions = () => {
        setLoading(true);
        fetchQuestions().then((res) => {
            const list = res?.rows || (Array.isArray(res) ? res : []);
            setRows(list);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        loadQuestions();
    }, [filters?.examId]);

    const filteredQuestions = useMemo(() => {
        let result = rows;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((item) => 
                (item.questionText && item.questionText.toLowerCase().includes(q)) ||
                (item.optionA && item.optionA.toLowerCase().includes(q)) ||
                (item.optionB && item.optionB.toLowerCase().includes(q)) ||
                (item.optionC && item.optionC.toLowerCase().includes(q)) ||
                (item.optionD && item.optionD.toLowerCase().includes(q))
            );
        }
        if (filters) {
            if (filters.examId) {
                const selectedExam = exams.find((e) => String(e.id || e.examId) === String(filters.examId));
                result = result.filter((q) => {
                    const qExamId = q.examId || q.exam?.id || q.exam_id;
                    if (qExamId) return String(qExamId) === String(filters.examId);
                    if (selectedExam) {
                        const title = q.examTitle || q.examName || (typeof q.exam === "string" ? q.exam : q.exam?.title);
                        if (title) return title === selectedExam.title;
                        return q.stack === selectedExam.stack;
                    }
                    return false;
                });
            }
            if (filters.type) {
                result = result.filter((q) => q.type === filters.type);
            }
            if (filters.difficulty) {
                result = result.filter((q) => (q.difficulty || "").toUpperCase() === filters.difficulty.toUpperCase());
            }
            if (filters.status) {
                result = result.filter((q) => q.status === filters.status);
            }
        }
        // Sort: INACTIVE first, then ACTIVE
        return [...result].sort((a, b) => {
            const statusA = a.status === "ACTIVE" || a.isActive ? 1 : 0;
            const statusB = b.status === "ACTIVE" || b.isActive ? 1 : 0;
            return statusA - statusB;
        });
    }, [rows, searchQuery, filters, exams]);

    const activeCount = useMemo(() => {
        return filteredQuestions.filter(q => q.status === "ACTIVE" || q.isActive).length;
    }, [filteredQuestions]);

    const inactiveCount = useMemo(() => {
        return filteredQuestions.filter(q => q.status === "INACTIVE" || !q.status && !q.isActive).length;
    }, [filteredQuestions]);

    const selectedQuestions = useMemo(() => {
        return rows.filter(q => selected.has(q.id));
    }, [rows, selected]);

    const hasActiveSelected = useMemo(() => {
        return selectedQuestions.some(q => q.status === "ACTIVE" || q.isActive);
    }, [selectedQuestions]);

    const hasInactiveSelected = useMemo(() => {
        return selectedQuestions.some(q => q.status === "INACTIVE" || !q.status && !q.isActive);
    }, [selectedQuestions]);

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelected((prev) => {
            const allSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => prev.has(q.id));
            const next = new Set(prev);
            filteredQuestions.forEach((q) => {
                if (allSelected) {
                    next.delete(q.id);
                } else {
                    next.add(q.id);
                }
            });
            return next;
        });
    };

    const handleActionClick = (type) => {
        if (selected.size === 0) return;
        setConfirmAction({ type, count: selected.size });
    };

    const executeAction = async () => {
        if (!confirmAction) return;
        setActionBusy(true);
        try {
            const ids = Array.from(selected);
            if (confirmAction.type === "DELETE") {
                await bulkDeleteQuestions(ids);
            } else {
                await bulkUpdateQuestions(ids, { status: confirmAction.type });
            }
            setSelected(new Set());
            setConfirmAction(null);
            loadQuestions();
            if (onRefresh) onRefresh();
        } catch (err) {
            alert("Action failed: " + err.message);
        } finally {
            setActionBusy(false);
        }
    };

    const selectedExam = exams.find((e) => String(e.id || e.examId) === String(filters?.examId));
    const displayExamTitle = selectedExam ? selectedExam.title : "Exam Questions";

    return (
        <div className="a1-modal-overlay" onClick={onClose}>
            <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(780px, 95vw)", height: "85vh", display: "flex", flexDirection: "column", padding: 0 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--a1-line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3 style={{ margin: 0 }}>Manage QA's - {displayExamTitle}</h3>
                        <span className="a1-pill a1-pill-navy" style={{ fontSize: 11 }}>{filteredQuestions.length} matching</span>
                    </div>
                    <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={onClose} style={{ padding: "4px 8px" }}>✕</button>
                </div>

                {/* Sticky Actions and Search Toolbar */}
                <div style={{ 
                    padding: "12px 20px", 
                    background: "#f8fafc", 
                    borderBottom: "1px solid var(--a1-line)", 
                    position: "sticky", 
                    top: 0, 
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                        <div className="a1-field" style={{ flex: 1, maxWidth: 300, marginBottom: 0 }}>
                            <input
                                type="text"
                                style={{ margin: 0, width: "100%", padding: "7px 10px", fontSize: 13 }}
                                placeholder="Search questions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {(!selected.size || hasInactiveSelected) && (
                                <button
                                    type="button"
                                    className="a1-btn a1-btn-active-colored a1-btn-sm"
                                    disabled={selected.size === 0}
                                    onClick={() => handleActionClick("ACTIVE")}
                                    style={{ padding: "6px 12px", fontSize: 12.5 }}
                                >
                                    Set Active
                                </button>
                            )}
                            {(!selected.size || hasActiveSelected) && (
                                <button
                                    type="button"
                                    className="a1-btn a1-btn-inactive-colored a1-btn-sm"
                                    disabled={selected.size === 0}
                                    onClick={() => handleActionClick("INACTIVE")}
                                    style={{ padding: "6px 12px", fontSize: 12.5 }}
                                >
                                    Set Inactive
                                </button>
                            )}
                            <button
                                type="button"
                                className="a1-btn a1-btn-delete-colored a1-btn-sm"
                                disabled={selected.size === 0}
                                onClick={() => handleActionClick("DELETE")}
                                style={{ padding: "6px 10px" }}
                                title="Delete Selected"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--a1-mut)" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer", userSelect: "none" }}>
                                <input
                                    type="checkbox"
                                    checked={filteredQuestions.length > 0 && filteredQuestions.every(q => selected.has(q.id))}
                                    onChange={toggleSelectAll}
                                />
                                Select All ({filteredQuestions.length})
                            </label>
                            <span>Selected: <strong>{selected.size}</strong></span>
                            <span style={{ margin: "0 4px", color: "var(--a1-line)" }}>|</span>
                            <span>Active: <strong style={{ color: "var(--a1-green)" }}>{activeCount}</strong></span>
                            <span style={{ margin: "0 4px", color: "var(--a1-line)" }}>|</span>
                            <span>Inactive: <strong style={{ color: "var(--a1-amber)" }}>{inactiveCount}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Questions list */}
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--a1-mut)" }}>Loading tech stack questions…</div>
                    ) : filteredQuestions.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--a1-mut)" }}>No questions found.</div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {filteredQuestions.map((q) => {
                                const isSelected = selected.has(q.id);
                                const isCorrect = (opt) => q.correctOption === opt;
                                return (
                                    <div
                                        key={q.id}
                                        className="a1-card"
                                        style={{
                                            padding: 14,
                                            margin: 0,
                                            border: `1.5px solid ${isSelected ? "var(--a1-navy)" : "var(--a1-line)"}`,
                                            background: isSelected ? "#f8fafc" : "#fff",
                                            transition: "all .15s",
                                            display: "flex",
                                            gap: 12,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(q.id)}
                                            style={{ marginTop: 4, width: 16, height: 16, cursor: "pointer" }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            {/* Question Text */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 8 }}>
                                                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--a1-navy)", lineHeight: 1.5 }}>
                                                    {q.questionText}
                                                </div>
                                                <span className={`a1-pill ${q.status === "ACTIVE" ? "a1-pill-green" : ""}`} style={{ fontSize: 10.5, textTransform: "uppercase" }}>
                                                    {q.status || (q.isActive ? "ACTIVE" : "INACTIVE")}
                                                </span>
                                            </div>

                                            {/* MCQ Options */}
                                            {q.type === "MCQ" && (
                                                <div style={{ 
                                                    display: "grid", 
                                                    gridTemplateColumns: "1fr 1fr", 
                                                    gap: 6, 
                                                    marginTop: 10,
                                                    padding: 10,
                                                    background: "#f1f5f9",
                                                    borderRadius: 8
                                                }}>
                                                    {["A", "B", "C", "D"].map((opt) => {
                                                        const field = `option${opt}`;
                                                        const correct = isCorrect(opt);
                                                        return (
                                                            <div key={opt} style={{ fontSize: 12, color: correct ? "var(--a1-green)" : "var(--a1-ink)", fontWeight: correct ? 700 : 500 }}>
                                                                {correct ? "●" : "○"} {opt}. {q[field]}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Inner Confirmation Dialog */}
                {confirmAction && (
                    <div className="a1-modal-overlay" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setConfirmAction(null)}>
                        <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(400px, 90vw)", padding: "20px 24px", textAlign: "center" }}>
                            <h4 style={{ margin: "0 0 10px", fontSize: 16 }}>Confirm Action</h4>
                            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--a1-mut)" }}>
                                Are you sure you want to {confirmAction.type === "DELETE" ? "delete" : "deactivate/activate"} {confirmAction.count} selected question(s)?
                                {confirmAction.type === "DELETE" && " This action is permanent and cannot be undone."}
                            </p>
                            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                                <button type="button" className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setConfirmAction(null)} disabled={actionBusy}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`a1-btn a1-btn-sm ${confirmAction.type === "DELETE" ? "a1-btn-red" : "a1-btn-primary"}`}
                                    onClick={executeAction}
                                    disabled={actionBusy}
                                >
                                    {actionBusy ? "Processing…" : "Confirm"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}