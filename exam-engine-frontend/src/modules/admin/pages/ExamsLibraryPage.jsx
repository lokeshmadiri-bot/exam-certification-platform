// A1 · Task 2 — Exams Library
// Card view + table view · create/edit exams ·
// publish new version · activate/deactivate (four-eyes) · search & filters ·
// KPI cards · pagination · refresh.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchExams, deleteExam,
    requestExamActivation, requestExamDeactivation,
    META,
} from "../services/api";
import { PendingApprovalBadge } from "../components/FourEyes";
import "../components/a1.css";

const PAGE_SIZE = 9; // cards: 3×3, table: 9 rows
const STACK_ICONS = { Java: "☕", React: "⚛", Python: "🐍", Node: "⬡", SQL: "🗄" };
const STACK_BG = { Java: "#fdf6e7", React: "#eaf2fb", Python: "#e9f5ee", Node: "#f0f6ee", SQL: "#f0ecfb" };

export default function ExamsLibraryPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState(null);
    const [view, setView] = useState("cards"); // "cards" | "table"
    const [filters, setFilters] = useState({ q: "", stack: "", status: "" });
    const [page, setPage] = useState(1);

    // Four-eyes
    const [statusAction, setStatusAction] = useState(null); // { exam, target: "ACTIVE"|"INACTIVE" }

    const load = () =>
        fetchExams(filters).then((res) => setRows(res?.rows || (Array.isArray(res) ? res : [])));

    useEffect(() => {
        load();
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    // KPIs
    const kpis = useMemo(() => {
        if (!rows) return { total: 0, active: 0, draft: 0, inactive: 0 };
        return {
            total: rows.length,
            active: rows.filter((e) => e.status === "ACTIVE").length,
            draft: rows.filter((e) => e.status === "DRAFT").length,
            inactive: rows.filter((e) => e.status === "INACTIVE").length,
        };
    }, [rows]);

    // Pagination
    const pageRows = useMemo(() => {
        if (!rows) return [];
        const start = (page - 1) * PAGE_SIZE;
        return rows.slice(start, start + PAGE_SIZE);
    }, [rows, page]);
    const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;

    // Actions
    const handleDelete = async (exam) => {
        if (window.confirm(`Are you sure you want to delete exam "${exam.title}"?`)) {
            await deleteExam(exam.id);
            load();
        }
    };

    const openStatusAction = async (exam, target) => {
        const actionLabel = target === "ACTIVE" ? "activate" : "deactivate";
        if (window.confirm(`Are you sure you want to ${actionLabel} exam "${exam.title}"?`)) {
            if (target === "ACTIVE") {
                await requestExamActivation(exam.id, "Direct activation");
            } else {
                await requestExamDeactivation(exam.id, "Direct deactivation");
            }
            load();
        }
    };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Exams Library</h1>
                    <p className="a1-sub">Create and manage your certification exams.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="a1-btn a1-btn-ghost" onClick={load}>↻ Refresh</button>
                    <button className="a1-btn a1-btn-primary" onClick={() => navigate("/admin/authoring")}>
                        + Create Exam
                    </button>
                </div>
            </header>


            {/* KPI row */}
            <div className="a1-kpi-row">
                <div className="a1-kpi">
                    <div className="a1-kpi-value">{kpis.total}</div>
                    <div className="a1-kpi-label">Total Exams</div>
                </div>
                <div className="a1-kpi a1-kpi-green">
                    <div className="a1-kpi-value">{kpis.active}</div>
                    <div className="a1-kpi-label">Active</div>
                </div>
                <div className="a1-kpi a1-kpi-amber">
                    <div className="a1-kpi-value">{kpis.draft}</div>
                    <div className="a1-kpi-label">Draft</div>
                </div>
                <div className="a1-kpi a1-kpi-red">
                    <div className="a1-kpi-value">{kpis.inactive}</div>
                    <div className="a1-kpi-label">Inactive</div>
                </div>
            </div>

            {/* Filter bar + view toggle */}
            <div className="a1-filterbar">
                <div className="a1-field">
                    <label>Search</label>
                    <input
                        placeholder="Search by exam name"
                        value={filters.q}
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    />
                </div>
                <div className="a1-field">
                    <label>Technology</label>
                    <select value={filters.stack} onChange={(e) => setFilters((f) => ({ ...f, stack: e.target.value }))}>
                        <option value="">All stacks</option>
                        {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="a1-field">
                    <label>Status</label>
                    <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                        <option value="">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DRAFT">Draft</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <div className="a1-view-toggle">
                        <button className={view === "cards" ? "a1-vt-active" : ""} onClick={() => setView("cards")}>
                            ▦ Cards
                        </button>
                        <button className={view === "table" ? "a1-vt-active" : ""} onClick={() => setView("table")}>
                            ≡ Table
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {!rows ? (
                <div className="a1-loading">Loading exams…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No exams match your filters.</div>
            ) : view === "cards" ? (
                /* ---- Card view ---- */
                <div className="a1-exam-cards">
                    {pageRows.map((exam) => (
                        <div key={exam.id} className="a1-exam-card">
                            <div className="a1-exam-card-head">
                                <div
                                    className="a1-exam-card-icon"
                                    style={{ background: STACK_BG[exam.stack] || "#eef3f9" }}
                                >
                                    {STACK_ICONS[exam.stack] || "📝"}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="a1-exam-card-title">{exam.title}</div>
                                    <div className="a1-exam-card-sub">{exam.stack}</div>
                                </div>
                            </div>
                            <div className="a1-exam-card-kpis">
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-chip-label">📝 Pool</span>
                                    <span className="a1-kpi-chip-val">{exam.questionPoolSize}</span>
                                </div>
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-chip-label">🎯 Attempt</span>
                                    <span className="a1-kpi-chip-val">{exam.questionsPerAttempt}</span>
                                </div>
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-chip-label">✅ Pass</span>
                                    <span className="a1-kpi-chip-val">{exam.passMark}%</span>
                                </div>
                            </div>
                            <div className="a1-exam-card-foot">
                                <div className="a1-exam-card-status-col">
                                    <StatusPill status={exam.status} />
                                    {exam.pendingApproval && <PendingApprovalBadge />}
                                </div>
                                <div className="a1-exam-card-actions">
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => navigate(`/admin/authoring?examId=${exam.id}`)}>
                                        ✏ Edit
                                    </button>
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm a1-btn-danger" onClick={() => handleDelete(exam)}>
                                        🗑 Delete
                                    </button>
                                    {exam.status !== "ACTIVE" && !exam.pendingApproval && (
                                        <button className="a1-btn a1-btn-primary a1-btn-sm" onClick={() => openStatusAction(exam, "ACTIVE")}>
                                            ▶ Activate
                                        </button>
                                    )}
                                    {exam.status === "ACTIVE" && !exam.pendingApproval && (
                                        <button className="a1-btn a1-btn-red a1-btn-sm" onClick={() => openStatusAction(exam, "INACTIVE")}>
                                            ⏸ Deactivate
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ---- Table view ---- */
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr>
                            <th>Exam</th><th>Stack</th><th>Pool</th>
                            <th>Per Attempt</th><th>Pass%</th><th>Status</th><th>Updated</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((exam) => (
                            <tr key={exam.id}>
                                <td style={{ fontWeight: 600 }}>{exam.title}</td>
                                <td>{exam.stack}</td>
                                <td className="a1-mono">{exam.questionPoolSize}</td>
                                <td className="a1-mono">{exam.questionsPerAttempt}</td>
                                <td className="a1-mono">{exam.passMark}%</td>
                                <td>
                                    <StatusPill status={exam.status} />
                                    {exam.pendingApproval && <PendingApprovalBadge />}
                                </td>
                                <td>{new Date(exam.updatedAt).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => navigate(`/admin/authoring?examId=${exam.id}`)}>
                                            Edit
                                        </button>
                                        <button className="a1-btn a1-btn-ghost a1-btn-sm" style={{ color: "#d9383a" }} onClick={() => handleDelete(exam)}>
                                            Delete
                                        </button>
                                        {exam.status !== "ACTIVE" && !exam.pendingApproval && (
                                            <button className="a1-btn a1-btn-primary a1-btn-sm" onClick={() => openStatusAction(exam, "ACTIVE")}>
                                                Activate
                                            </button>
                                        )}
                                        {exam.status === "ACTIVE" && !exam.pendingApproval && (
                                            <button className="a1-btn a1-btn-red a1-btn-sm" onClick={() => openStatusAction(exam, "INACTIVE")}>
                                                Deactivate
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Pagination */}
            {rows && rows.length > PAGE_SIZE && (
                <div className="a1-pagination">
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        ← Prev
                    </button>
                    <span className="a1-sub">Page {page} of {totalPages}</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Next →
                    </button>
                </div>
            )}


        </div>
    );
}

function StatusPill({ status }) {
    const cls =
        status === "ACTIVE"
            ? "a1-pill-green"
            : status === "INACTIVE"
              ? "a1-pill-red"
              : status === "DRAFT"
                ? "a1-pill-amber"
                : "";
    const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : "";
    return <span className={`a1-pill ${cls}`}><span className="a1-pill-dot">●</span> {label}</span>;
}
