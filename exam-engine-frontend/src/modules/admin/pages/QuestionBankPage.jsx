// A1 · Task 4 — Question Bank
// Full Question Authoring & Management (Manual & AI):
//   - Full question editor with MCQ (Radio buttons for correct answer selection),
//     Coding (starter code, sample inputs/outputs, language), and Descriptive (model answer).
//   - Rich Question Viewer modal with full answer key & metadata.
//   - Search, Filter by Stack/Type/Level/Status, Bulk Actions, and Gemini AI Generation integration.

import React, { useEffect, useMemo, useState } from "react";
import {
    fetchQuestions, fetchExams, createQuestion, updateQuestion, deleteQuestion, bulkUpdateQuestions, META,
} from "../services/api";
import AIQuestionGenerator from "../components/AIQuestionGenerator";
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
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [aiSavedToast, setAiSavedToast] = useState(null);

    const load = () => {
        fetchQuestions(filters).then((res) => setRows(res?.rows || (Array.isArray(res) ? res : [])));
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

    const exportSelectedQuestions = () => {
        const items = filteredRows.filter((q) => selected.size === 0 || selected.has(q.id));
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `questions_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Question Bank</h1>
                    <p className="a1-sub">Create, author, and manage the question pool that certification exams draw from.</p>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="a1-btn a1-btn-ghost" onClick={exportSelectedQuestions}>
                        ⤓ Export JSON
                    </button>
                    <button
                        className="a1-btn a1-btn-ghost"
                        onClick={() => setShowAIGenerator(true)}
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
                    <label>Stack</label>
                    <select value={filters.stack} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, stack: e.target.value })); }}>
                        <option value="">All stacks</option>
                        {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
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
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
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
            </div>

            {/* Questions Table */}
            {!rows ? (
                <div className="a1-loading">Loading questions…</div>
            ) : filteredRows.length === 0 ? (
                <div className="a1-empty">No questions match your filters.</div>
            ) : (
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr>
                            <th className="a1-checkbox-col" style={{ textAlign: "center" }}>
                                <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((q) => selected.has(q.id))} onChange={toggleSelectAllPage} />
                            </th>
                            <th style={{ textAlign: "center" }}>Question</th>
                            <th style={{ textAlign: "center" }}>Assigned Exam</th>
                            <th style={{ textAlign: "center" }}>Stack</th>
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
                            const displayDiff = q.difficulty ? (q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1).toLowerCase()) : "Medium";
                            return (
                                <tr key={q.id}>
                                    <td className="a1-checkbox-col" style={{ textAlign: "center" }}>
                                        <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
                                    </td>
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
                                    <td style={{ textAlign: "center" }}>
                                        <span className="a1-pill a1-pill-navy" style={{ fontWeight: 600 }}>
                                            {assignedExamTitle}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>{q.stack}</td>
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
                                            <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setEditing(q)}>Edit</button>
                                            <button className="a1-btn a1-btn-red a1-btn-sm" onClick={() => setConfirmDelete(q)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {/* Pagination */}
            {filteredRows && filteredRows.length > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span className="a1-sub">Page {page} of {totalPages}</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selected.size > 0 && (
                <div className="a1-bulkbar">
                    <span>{selected.size} question{selected.size > 1 ? "s" : ""} selected</span>
                    <div className="a1-bulkbar-actions">
                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => bulkSetStatus("ACTIVE")}>Set Active</button>
                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => bulkSetStatus("INACTIVE")}>Set Inactive</button>
                        <button className="a1-btn a1-btn-red a1-btn-sm" onClick={bulkDelete}>Delete</button>
                    </div>
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

            {/* AI Generator Modal */}
            {showAIGenerator && (
                <AIQuestionGenerator
                    exams={exams}
                    onClose={() => setShowAIGenerator(false)}
                    onSaved={(count) => {
                        setShowAIGenerator(false);
                        setAiSavedToast(count);
                        load();
                    }}
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
    const [form, setForm] = useState({
        examId: question.exam?.id || question.examId || (exams[0]?.id || ""),
        questionText: question.questionText || question.title || "",
        stack: question.stack || META.STACKS[0],
        topic: question.topic || "",
        type: question.type || "MCQ",
        level: question.level || "L1",
        difficulty: question.difficulty || "EASY",
        marks: question.marks || 1,
        status: question.status || "ACTIVE",

        // MCQ
        optionA: question.optionA || "",
        optionB: question.optionB || "",
        optionC: question.optionC || "",
        optionD: question.optionD || "",
        correctOption: question.correctOption || "A",

        // Coding
        codeSnippet: question.codeSnippet || "",
        language: question.language || "Java",
        sampleInput: question.sampleInput || "",
        sampleOutput: question.sampleOutput || "",
        expectedOutput: question.expectedOutput || "",

        // Descriptive
        modelAnswer: question.modelAnswer || "",
        explanation: question.explanation || "",
    });
    const [busy, setBusy] = useState(false);

    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const selectedExam = exams.find((e) => String(e.id) === String(form.examId));
            await onSave({
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
                            <label>Exam Association *</label>
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
                            <label>Stack *</label>
                            <select value={form.stack} onChange={(e) => setField("stack", e.target.value)}>
                                {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Topic *</label>
                            <input
                                required
                                placeholder="e.g. Core Java / OOP / Hooks"
                                value={form.topic}
                                onChange={(e) => setField("topic", e.target.value)}
                            />
                        </div>
                        <div className="a1-field">
                            <label>Question Type *</label>
                            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                                {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Competency Level *</label>
                            <select value={form.level} onChange={(e) => setField("level", e.target.value)}>
                                {META.LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Difficulty Tag *</label>
                            <select value={form.difficulty} onChange={(e) => setField("difficulty", e.target.value)}>
                                {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Marks *</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                required
                                value={form.marks}
                                onChange={(e) => setField("marks", Number(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Question Text */}
                    <div className="a1-field" style={{ marginBottom: 14 }}>
                        <label>Question Text *</label>
                        <textarea
                            className="a1-textarea"
                            required
                            placeholder="Enter the full question prompt..."
                            value={form.questionText}
                            onChange={(e) => setField("questionText", e.target.value)}
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    {/* Dynamic Section: MCQ Options + Radio Button for Correct Answer */}
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

                    {/* Dynamic Section: Coding Question */}
                    {form.type === "CODING" && (
                        <div style={{ background: "#f8fafc", border: "1px solid var(--a1-line)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                            <div className="a1-field" style={{ marginBottom: 10 }}>
                                <label>Programming Language</label>
                                <select value={form.language} onChange={(e) => setField("language", e.target.value)}>
                                    {LANGUAGE_OPTIONS.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
                                </select>
                            </div>
                            <div className="a1-field" style={{ marginBottom: 10 }}>
                                <label>Starter / Template Code</label>
                                <textarea
                                    className="a1-textarea a1-mono"
                                    placeholder="public class Main {\n  public static void main(String[] args) {\n    // Write solution\n  }\n}"
                                    value={form.codeSnippet}
                                    onChange={(e) => setField("codeSnippet", e.target.value)}
                                    style={{ minHeight: 90, fontSize: 12.5 }}
                                />
                            </div>
                            <div className="a1-form-grid" style={{ marginBottom: 10 }}>
                                <div className="a1-field">
                                    <label>Sample Input</label>
                                    <textarea
                                        className="a1-textarea a1-mono"
                                        placeholder="e.g. 5\n1 2 3 4 5"
                                        value={form.sampleInput}
                                        onChange={(e) => setField("sampleInput", e.target.value)}
                                        style={{ minHeight: 60 }}
                                    />
                                </div>
                                <div className="a1-field">
                                    <label>Sample Output</label>
                                    <textarea
                                        className="a1-textarea a1-mono"
                                        placeholder="e.g. 15"
                                        value={form.sampleOutput}
                                        onChange={(e) => setField("sampleOutput", e.target.value)}
                                        style={{ minHeight: 60 }}
                                    />
                                </div>
                            </div>
                            <div className="a1-field">
                                <label>Expected Test Case Output</label>
                                <textarea
                                    className="a1-textarea a1-mono"
                                    placeholder="Expected output for evaluation..."
                                    value={form.expectedOutput}
                                    onChange={(e) => setField("expectedOutput", e.target.value)}
                                    style={{ minHeight: 60 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Dynamic Section: Descriptive Question */}
                    {form.type === "DESCRIPTIVE" && (
                        <div style={{ background: "#f8fafc", border: "1px solid var(--a1-line)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                            <div className="a1-field">
                                <label>Model Answer / Evaluation Guide</label>
                                <textarea
                                    className="a1-textarea"
                                    placeholder="Provide key concepts, evaluation criteria, or model answer..."
                                    value={form.modelAnswer}
                                    onChange={(e) => setField("modelAnswer", e.target.value)}
                                    style={{ minHeight: 90 }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Explanation / Notes */}
                    <div className="a1-field" style={{ marginBottom: 14 }}>
                        <label>Explanation / Answer Rationale (Optional)</label>
                        <textarea
                            className="a1-textarea"
                            placeholder="Explain why the correct answer is right (shown in candidate result review)..."
                            value={form.explanation}
                            onChange={(e) => setField("explanation", e.target.value)}
                            style={{ minHeight: 60 }}
                        />
                    </div>

                    <div className="a1-field" style={{ marginBottom: 14 }}>
                        <label>Status</label>
                        <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>

                    <div className="a1-modal-actions">
                        <button type="button" className="a1-btn a1-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                        <button className="a1-btn a1-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save Question"}</button>
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

                {/* Metadata Badges */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <span className="a1-pill">{question.stack}</span>
                    {question.topic && <span className="a1-pill a1-pill-navy">{question.topic}</span>}
                    <span className="a1-pill a1-pill-amber">{question.difficulty || "MEDIUM"}</span>
                    <span className="a1-pill">{TYPE_LABEL[question.type] || question.type}</span>
                    <span className="a1-pill a1-pill-navy">{question.marks || 1} Mark{(question.marks || 1) > 1 ? "s" : ""}</span>
                    <span className={`a1-pill ${question.source === "AI" ? "a1-pill-green" : ""}`}>{question.source || "MANUAL"}</span>
                    <span className={`a1-pill ${question.status === "ACTIVE" ? "a1-pill-green" : ""}`}>{question.status}</span>
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
                                            width: 24,
                                        }}>
                                            {isCorrect ? "(●)" : "( )"} {opt}
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