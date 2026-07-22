// A1 · Task 4 — Question Bank
// CRUD (create/edit/delete/view) · types (MCQ/Coding/Descriptive) ·
// difficulty tags L1–L5 · status Active/Inactive · search + filter ·
// bulk actions · pool size note.

import React, { useEffect, useMemo, useState } from "react";
import {
    fetchQuestions, createQuestion, updateQuestion, deleteQuestion, bulkUpdateQuestions, META,
} from "./api";
import "./a1.css";

const PAGE_SIZE = 10;
const TYPE_LABEL = { MCQ: "MCQ", CODING: "Coding", DESCRIPTIVE: "Descriptive" };

const emptyQuestion = { title: "", stack: META.STACKS[0], type: "MCQ", level: "L1", status: "ACTIVE" };

export default function QuestionBankPage() {
    const [rows, setRows] = useState(null);
    const [filters, setFilters] = useState({ q: "", stack: "", type: "", level: "", status: "" });
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(new Set());
    const [editing, setEditing] = useState(null); // question object or {} for new
    const [confirmDelete, setConfirmDelete] = useState(null);

    const load = () => fetchQuestions(filters).then((res) => setRows(res.rows));

    useEffect(() => {
        load();
        setSelected(new Set());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const pageRows = useMemo(() => {
        if (!rows) return [];
        const start = (page - 1) * PAGE_SIZE;
        return rows.slice(start, start + PAGE_SIZE);
    }, [rows, page]);

    const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;
    const activeCount = rows ? rows.filter((q) => q.status === "ACTIVE").length : 0;

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
                    <p className="a1-sub">Create and manage the question pool that exams draw from.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <button className="a1-btn a1-btn-ghost" onClick={load}>↻ Refresh</button>
                    <button className="a1-btn a1-btn-primary" onClick={() => setEditing({ ...emptyQuestion })}>
                        + Create Question
                    </button>
                </div>
            </header>

            <div className="a1-pool-note">
                Example: Question Pool = 120 · Per Attempt = 30 · Minimum Required Questions = 30.
                {rows && ` Active questions matching current filters: ${activeCount} of ${rows.length}.`}
            </div>

            <div className="a1-filterbar" style={{ marginTop: 18 }}>
                <div className="a1-field">
                    <label>Search</label>
                    <input
                        placeholder="Search question title"
                        value={filters.q}
                        onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }}
                    />
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
                    <select value={filters.level} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, level: e.target.value })); }}>
                        <option value="">All levels</option>
                        {META.LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
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

            {!rows ? (
                <div className="a1-loading">Loading questions…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No questions match your filters.</div>
            ) : (
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr>
                            <th className="a1-checkbox-col">
                                <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((q) => selected.has(q.id))} onChange={toggleSelectAllPage} />
                            </th>
                            <th>Question</th><th>Stack</th><th>Type</th><th>Difficulty</th><th>Status</th><th>Updated</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((q) => (
                            <tr key={q.id}>
                                <td className="a1-checkbox-col">
                                    <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggleSelect(q.id)} />
                                </td>
                                <td>{q.title}</td>
                                <td>{q.stack}</td>
                                <td>{TYPE_LABEL[q.type]}</td>
                                <td><span className={`a1-pill a1-lvl-${q.level}`}>{q.level}</span></td>
                                <td><span className={`a1-pill ${q.status === "ACTIVE" ? "a1-pill-green" : ""}`}>{q.status}</span></td>
                                <td>{new Date(q.updatedAt).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setEditing(q)}>Edit</button>
                                        <button className="a1-btn a1-btn-red a1-btn-sm" onClick={() => setConfirmDelete(q)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {rows && rows.length > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span className="a1-sub">Page {page} of {totalPages}</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
            )}

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

            {editing && (
                <QuestionModal
                    question={editing}
                    onCancel={() => setEditing(null)}
                    onSave={saveQuestion}
                />
            )}

            {confirmDelete && (
                <div className="a1-modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete question?</h3>
                        <p className="a1-sub">“{confirmDelete.title}” will be permanently removed from the bank.</p>
                        <div className="a1-modal-actions">
                            <button className="a1-btn a1-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="a1-btn a1-btn-red" onClick={doDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function QuestionModal({ question, onCancel, onSave }) {
    const [form, setForm] = useState({
        title: question.title || "",
        stack: question.stack || META.STACKS[0],
        type: question.type || "MCQ",
        level: question.level || "L1",
        status: question.status || "ACTIVE",
    });
    const [busy, setBusy] = useState(false);
    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave(form);
        setBusy(false);
    };

    return (
        <div className="a1-modal-overlay" onClick={onCancel}>
            <div className="a1-modal" onClick={(e) => e.stopPropagation()}>
                <h3>{question.id ? "Edit Question" : "Create Question"}</h3>
                <form onSubmit={submit}>
                    <div className="a1-field" style={{ marginBottom: 12 }}>
                        <label>Question title</label>
                        <input required value={form.title} onChange={(e) => setField("title", e.target.value)} />
                    </div>
                    <div className="a1-form-grid">
                        <div className="a1-field">
                            <label>Stack</label>
                            <select value={form.stack} onChange={(e) => setField("stack", e.target.value)}>
                                {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Type</label>
                            <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                                {META.QUESTION_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Difficulty</label>
                            <select value={form.level} onChange={(e) => setField("level", e.target.value)}>
                                {META.LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="a1-field">
                            <label>Status</label>
                            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="a1-modal-actions">
                        <button type="button" className="a1-btn a1-btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
                        <button className="a1-btn a1-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}