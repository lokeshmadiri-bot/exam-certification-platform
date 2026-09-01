// A1 · Task 2 — Exams Library
// Card view + table view · create/edit exams ·
// publish new version · activate/deactivate (four-eyes) · search & filters ·
// KPI cards · pagination · refresh.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchExams, deleteExam,
    requestExamActivation, requestExamDeactivation,
    fetchPendingApprovals,
    META,
} from "../services/api";
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
    const [availableStacks, setAvailableStacks] = useState(META.STACKS);
    const [confirmModal, setConfirmModal] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Load unique stacks from all existing exams on mount
    useEffect(() => {
        fetchExams().then((res) => {
            const list = res?.rows || (Array.isArray(res) ? res : []);
            const customStacks = list.map(e => e.stack).filter(Boolean);
            setAvailableStacks(Array.from(new Set([...META.STACKS, ...customStacks])));
        }).catch(() => {});
    }, []);

    // Four-eyes
    const [statusAction, setStatusAction] = useState(null); // { exam, target: "ACTIVE"|"INACTIVE" }
    const [pendingApprovals, setPendingApprovals] = useState([]);

    const load = () => {
        fetchExams(filters).then((res) => {
            const list = res?.rows || (Array.isArray(res) ? res : []);
            const sorted = [...list].sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0);
                const dateB = new Date(b.updatedAt || b.createdAt || 0);
                return dateB - dateA;
            });
            setRows(sorted);
        });
        fetchPendingApprovals().then((res) => setPendingApprovals(Array.isArray(res) ? res : (res?.rows || [])));
    };

    const isExamPending = (exam) => {
        if (exam.pendingApproval) return true;
        return pendingApprovals.some((a) => String(a.targetId) === String(exam.id) && a.status === "PENDING");
    };

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

    // Actions (User-friendly Modals)
    const handleDelete = (exam) => {
        setConfirmModal({
            title: "Delete exam?",
            description: `"${exam.title}" will be permanently removed from the exams library.`,
            confirmText: "Delete",
            confirmVariant: "a1-btn-red",
            onConfirm: async () => {
                setModalLoading(true);
                try {
                    await deleteExam(exam.id);
                    load();
                    setConfirmModal(null);
                } catch (err) {
                    setConfirmModal({
                        title: "Delete Failed",
                        description: err?.message || "Failed to delete the exam.",
                        isWarningOnly: true,
                        confirmText: "Close",
                        confirmVariant: "a1-btn-primary"
                    });
                } finally {
                    setModalLoading(false);
                }
            }
        });
    };

    const openStatusAction = (exam, target) => {
        const poolSize = exam.questionPoolSize ?? exam.questionPool ?? 0;
        const currentCount = exam.currentQuestionCount ?? 0;
        const remaining = exam.remainingQuestionsNeeded ?? Math.max(0, poolSize - currentCount);

        if (target === "ACTIVE" && currentCount < poolSize) {
            setConfirmModal({
                title: "Cannot Activate Exam",
                isWarningOnly: true,
                warningDetails: {
                    examTitle: exam.title,
                    poolSize,
                    currentCount,
                    remaining
                },
                confirmText: "Got it",
                confirmVariant: "a1-btn-primary"
            });
            return;
        }

        const actionLabel = target === "ACTIVE" ? "Activate" : "Deactivate";
        const actionDesc = target === "ACTIVE"
            ? `Are you sure you want to activate exam "${exam.title}"?`
            : `Are you sure you want to deactivate exam "${exam.title}"?`;

        setConfirmModal({
            title: `${actionLabel} exam?`,
            description: actionDesc,
            confirmText: actionLabel,
            confirmVariant: target === "ACTIVE" ? "a1-btn-primary" : "a1-btn-red",
            onConfirm: async () => {
                setModalLoading(true);
                try {
                    if (target === "ACTIVE") {
                        await requestExamActivation(exam.id, "Direct activation");
                    } else {
                        await requestExamDeactivation(exam.id, "Direct deactivation");
                    }
                    load();
                    setConfirmModal(null);
                } catch (err) {
                    setConfirmModal({
                        title: "Status Update Failed",
                        description: err?.message || "Failed to update exam status.",
                        isWarningOnly: true,
                        confirmText: "Close",
                        confirmVariant: "a1-btn-primary"
                    });
                } finally {
                    setModalLoading(false);
                }
            }
        });
    };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Exams Library</h1>
                    <p className="a1-sub">Create and manage your certification exams.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                        {availableStacks.map((s) => <option key={s} value={s}>{s}</option>)}
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
                            <div className="a1-exam-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0, flex: 1 }}>
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
                                <div style={{ flexShrink: 0 }}>
                                    <StatusPill status={exam.status} />
                                </div>
                            </div>
                            <div className="a1-exam-card-kpis">
                                <div className="a1-exam-kpi-chip" title={exam.currentQuestionCount != null ? `Available: ${exam.currentQuestionCount} / Required: ${exam.questionPoolSize ?? exam.questionPool}` : ""}>
                                    <span className="a1-kpi-icon">📝</span>
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                        <span className="a1-kpi-chip-label">Pool Size</span>
                                        <span className="a1-kpi-chip-val" style={{ color: exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? "#d9383a" : "inherit" }}>
                                            {exam.currentQuestionCount != null ? `${exam.currentQuestionCount}/${exam.questionPoolSize ?? exam.questionPool}` : (exam.questionPoolSize ?? exam.questionPool)}
                                        </span>
                                    </div>
                                </div>
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-icon">🎯</span>
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                        <span className="a1-kpi-chip-label">Per Attempt</span>
                                        <span className="a1-kpi-chip-val">{exam.questionsPerAttempt ?? exam.perAttempt}</span>
                                    </div>
                                </div>
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-icon">✅</span>
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                        <span className="a1-kpi-chip-label">Pass Cutoff</span>
                                        <span className="a1-kpi-chip-val">{exam.passMark}%</span>
                                    </div>
                                </div>
                                <div className="a1-exam-kpi-chip">
                                    <span className="a1-kpi-icon">⭐</span>
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                        <span className="a1-kpi-chip-label">Max Marks</span>
                                        <span className="a1-kpi-chip-val">{exam.totalMarks ?? 100}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="a1-exam-card-foot">
                                <div className="a1-exam-card-actions" style={{ width: "100%", justifyContent: "flex-end" }}>
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => navigate(`/admin/authoring?examId=${exam.id}`)}>
                                        ✏ Edit
                                    </button>
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm a1-btn-danger" onClick={() => handleDelete(exam)}>
                                        🗑 Delete
                                    </button>
                                    {isExamPending(exam) ? (
                                        <span className="a1-pending-badge" style={{ marginLeft: 0, padding: "4px 8px", whiteSpace: "nowrap", height: "32px" }}>
                                            Pending
                                        </span>
                                    ) : exam.status !== "ACTIVE" ? (
                                        <button
                                            className={`a1-btn ${exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? "a1-btn-ghost" : "a1-btn-primary"} a1-btn-sm`}
                                            title={exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? `Question pool incomplete: ${exam.currentQuestionCount}/${exam.questionPoolSize ?? exam.questionPool} (${(exam.questionPoolSize ?? exam.questionPool ?? 0) - exam.currentQuestionCount} more needed)` : "Activate exam"}
                                            onClick={() => openStatusAction(exam, "ACTIVE")}
                                        >
                                            ▶ Activate
                                        </button>
                                    ) : (
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
                <div className="a1-table-container">
                    <table className="a1-table a1-table-hover">
                        <thead>
                            <tr>
                                <th>Exam</th><th>Stack</th><th>Pool (Avail/Req)</th>
                                <th>Per Attempt</th><th>Marks</th><th>Pass%</th><th style={{ textAlign: "center" }}>Status</th><th>Updated</th><th />
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map((exam) => (
                                <tr key={exam.id}>
                                    <td style={{ fontWeight: 600 }}>{exam.title}</td>
                                    <td>{exam.stack}</td>
                                    <td className="a1-mono" style={{ color: exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? "#d9383a" : "inherit" }}>
                                        {exam.currentQuestionCount != null ? `${exam.currentQuestionCount}/${exam.questionPoolSize ?? exam.questionPool}` : (exam.questionPoolSize ?? exam.questionPool)}
                                    </td>
                                    <td className="a1-mono">{exam.questionsPerAttempt ?? exam.perAttempt}</td>
                                    <td className="a1-mono">{exam.totalMarks ?? 100}</td>
                                    <td className="a1-mono">{exam.passMark}%</td>
                                    <td style={{ textAlign: "center" }}>
                                        <StatusPill status={exam.status} />
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
                                            {isExamPending(exam) ? (
                                                <span className="a1-pending-badge" style={{ marginLeft: 0, padding: "4px 8px", whiteSpace: "nowrap", height: "32px" }}>
                                                    Pending
                                                </span>
                                            ) : exam.status !== "ACTIVE" ? (
                                                <button
                                                    className={`a1-btn ${exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? "a1-btn-ghost" : "a1-btn-primary"} a1-btn-sm`}
                                                    title={exam.currentQuestionCount != null && exam.currentQuestionCount < (exam.questionPoolSize ?? exam.questionPool ?? 0) ? `Question pool incomplete: ${exam.currentQuestionCount}/${exam.questionPoolSize ?? exam.questionPool} (${(exam.questionPoolSize ?? exam.questionPool ?? 0) - exam.currentQuestionCount} more needed)` : "Activate exam"}
                                                    onClick={() => openStatusAction(exam, "ACTIVE")}
                                                >
                                                    Activate
                                                </button>
                                            ) : (
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
                </div>
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

            {/* Custom Confirmation / Alert Modal */}
            {confirmModal && (
                <div className="a1-modal-overlay" onClick={() => !modalLoading && setConfirmModal(null)}>
                    <div
                        className="a1-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "min(480px, 92vw)",
                            borderRadius: "16px",
                            padding: "24px 26px",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                        }}
                    >
                        <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--a1-navy)", margin: "0 0 14px 0" }}>
                            {confirmModal.title}
                        </h3>

                        {confirmModal.warningDetails ? (
                            <div style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--a1-ink)", marginBottom: "20px" }}>
                                <p style={{ margin: "0 0 12px 0", color: "var(--a1-mut)" }}>
                                    Exam <strong>"{confirmModal.warningDetails.examTitle}"</strong> cannot be activated yet because the question pool is incomplete:
                                </p>
                                <div style={{ background: "#f8fafc", border: "1px solid var(--a1-line)", borderRadius: "10px", padding: "12px 16px", marginBottom: "12px", fontSize: "13px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ color: "var(--a1-mut)" }}>Configured Pool Size:</span>
                                        <strong style={{ color: "var(--a1-navy)" }}>{confirmModal.warningDetails.poolSize}</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                        <span style={{ color: "var(--a1-mut)" }}>Current Available Questions:</span>
                                        <strong style={{ color: "var(--a1-red)" }}>{confirmModal.warningDetails.currentCount}</strong>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--a1-line)", paddingTop: "6px", marginTop: "6px" }}>
                                        <span style={{ color: "var(--a1-mut)" }}>Remaining Needed:</span>
                                        <strong style={{ color: "var(--a1-red)" }}>{confirmModal.warningDetails.remaining}</strong>
                                    </div>
                                </div>
                                <p style={{ margin: 0, fontSize: "13px", color: "var(--a1-mut)" }}>
                                    Please add <strong>{confirmModal.warningDetails.remaining}</strong> more active question(s) to this exam before requesting activation.
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontSize: "14.5px", lineHeight: 1.5, color: "var(--a1-mut)", margin: "0 0 20px 0" }}>
                                {confirmModal.description}
                            </p>
                        )}

                        <div className="a1-modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            {!confirmModal.isWarningOnly && (
                                <button
                                    type="button"
                                    className="a1-btn a1-btn-ghost"
                                    onClick={() => setConfirmModal(null)}
                                    disabled={modalLoading}
                                    style={{ borderRadius: "10px", padding: "8px 18px" }}
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="button"
                                className={`a1-btn ${confirmModal.confirmVariant || "a1-btn-primary"}`}
                                onClick={() => {
                                    if (confirmModal.isWarningOnly) {
                                        setConfirmModal(null);
                                    } else if (confirmModal.onConfirm) {
                                        confirmModal.onConfirm();
                                    }
                                }}
                                disabled={modalLoading}
                                style={{ borderRadius: "10px", padding: "8px 20px" }}
                            >
                                {modalLoading ? "Processing..." : confirmModal.confirmText || "OK"}
                            </button>
                        </div>
                    </div>
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
