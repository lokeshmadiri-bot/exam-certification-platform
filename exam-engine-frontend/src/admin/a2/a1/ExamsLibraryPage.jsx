// A1 · Task 2 — Exams Library
// Card view + table view · create/edit/duplicate exams · version history ·
// publish new version · activate/deactivate (four-eyes) · search & filters ·
// KPI cards · pagination · refresh.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchExams, duplicateExam, deleteExam,
    requestExamActivation, requestExamDeactivation,
    fetchExamVersions, publishExamVersion,
    META,
} from "./api";
import { TwoPersonRuleBanner, PendingApprovalBadge, RequestApprovalModal } from "./FourEyes";
import "./a1.css";

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

    // Version history
    const [versionModal, setVersionModal] = useState(null); // exam object
    const [versions, setVersions] = useState([]);
    const [publishNote, setPublishNote] = useState("");
    const [publishing, setPublishing] = useState(false);

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
    const handleDuplicate = async (exam) => {
        await duplicateExam(exam.id);
        load();
    };

    const handleDelete = async (exam) => {
        if (window.confirm(`Are you sure you want to delete exam "${exam.title}"?`)) {
            await deleteExam(exam.id);
            load();
        }
    };

    const openStatusAction = (exam, target) => setStatusAction({ exam, target });

    const submitStatusAction = async (note) => {
        if (statusAction.target === "ACTIVE") {
            await requestExamActivation(statusAction.exam.id, note);
        } else {
            await requestExamDeactivation(statusAction.exam.id, note);
        }
        setStatusAction(null);
        load();
    };

    const openVersions = async (exam) => {
        setVersionModal(exam);
        const v = await fetchExamVersions(exam.id);
        setVersions(v);
    };

    const handlePublish = async () => {
        if (!versionModal) return;
        setPublishing(true);
        await publishExamVersion(versionModal.id, { notes: publishNote });
        setPublishing(false);
        setPublishNote("");
        const v = await fetchExamVersions(versionModal.id);
        setVersions(v);
        load();
    };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Exams Library</h1>
                    <p className="a1-sub">Create, manage, and version your certification exams.</p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button className="a1-btn a1-btn-ghost" onClick={load}>↻ Refresh</button>
                    <button className="a1-btn a1-btn-primary" onClick={() => navigate("/admin/authoring")}>
                        + Create Exam
                    </button>
                </div>
            </header>

            <TwoPersonRuleBanner text="Activating or deactivating an exam requires approval from a second administrator." />

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
                                    <div className="a1-exam-card-sub">{exam.stack} · v{exam.version}</div>
                                </div>
                            </div>
                            <div className="a1-exam-card-facts">
                                <span>Pool <b>{exam.questionPoolSize}</b></span>
                                <span>Per attempt <b>{exam.questionsPerAttempt}</b></span>
                                <span>Pass <b>{exam.passMark}%</b></span>
                            </div>
                            <div className="a1-exam-card-foot">
                                <div className="a1-exam-card-status-row">
                                    <div>
                                        <StatusPill status={exam.status} />
                                        {exam.pendingApproval && <PendingApprovalBadge />}
                                    </div>
                                </div>
                                <div className="a1-exam-card-actions">
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => navigate(`/admin/authoring?examId=${exam.id}`)}>
                                        Edit
                                    </button>
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => handleDuplicate(exam)}>
                                        Duplicate
                                    </button>
                                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => openVersions(exam)}>
                                        Versions
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
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ---- Table view ---- */
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr>
                            <th>Exam</th><th>Stack</th><th>Version</th><th>Pool</th>
                            <th>Per Attempt</th><th>Pass%</th><th>Status</th><th>Updated</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((exam) => (
                            <tr key={exam.id}>
                                <td style={{ fontWeight: 600 }}>{exam.title}</td>
                                <td>{exam.stack}</td>
                                <td className="a1-mono">v{exam.version}</td>
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
                                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => handleDuplicate(exam)}>
                                            Duplicate
                                        </button>
                                        <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => openVersions(exam)}>
                                            Versions
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

            {/* ---- Four-Eyes modal for activate/deactivate ---- */}
            <RequestApprovalModal
                open={!!statusAction}
                title={statusAction ? `${statusAction.target === "ACTIVE" ? "Activate" : "Deactivate"} — ${statusAction.exam.title}` : ""}
                description={
                    statusAction?.target === "ACTIVE"
                        ? "The exam will become available to candidates once a second administrator approves."
                        : "The exam will be hidden from candidates once a second administrator approves."
                }
                confirmLabel={statusAction?.target === "ACTIVE" ? "Request activation" : "Request deactivation"}
                tone={statusAction?.target === "ACTIVE" ? "primary" : "red"}
                onCancel={() => setStatusAction(null)}
                onConfirm={submitStatusAction}
            />

            {/* ---- Version history modal ---- */}
            {versionModal && (
                <div className="a1-modal-overlay" onClick={() => setVersionModal(null)}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)" }}>
                        <h3>Version History · {versionModal.title}</h3>
                        <p className="a1-sub">Current version: v{versionModal.version}</p>

                        {versions.length === 0 ? (
                            <div className="a1-empty" style={{ padding: 16 }}>No versions published yet.</div>
                        ) : (
                            <ul className="a1-version-list">
                                {versions
                                    .sort((a, b) => b.version - a.version)
                                    .map((v) => (
                                        <li key={v.id} className="a1-version-item">
                                            <div>
                                                <strong>v{v.version}</strong>
                                                {v.notes && <span className="a1-sub" style={{ marginLeft: 8 }}>— {v.notes}</span>}
                                            </div>
                                            <div className="a1-version-item-meta">
                                                {v.publishedBy} · {new Date(v.publishedAt).toLocaleDateString()}
                                            </div>
                                        </li>
                                    ))}
                            </ul>
                        )}

                        <div style={{ borderTop: `1px solid var(--a1-line)`, paddingTop: 14, marginTop: 10 }}>
                            <label className="a1-field" style={{ marginBottom: 8 }}>
                                <span style={{ fontWeight: 600 }}>Publish new version</span>
                            </label>
                            <textarea
                                className="a1-textarea"
                                style={{ marginTop: 0 }}
                                placeholder="Release notes (optional)…"
                                value={publishNote}
                                onChange={(e) => setPublishNote(e.target.value)}
                            />
                            <div className="a1-modal-actions">
                                <button className="a1-btn a1-btn-ghost" onClick={() => setVersionModal(null)}>
                                    Close
                                </button>
                                <button className="a1-btn a1-btn-primary" disabled={publishing} onClick={handlePublish}>
                                    {publishing ? "Publishing…" : "Publish v" + (versionModal.version + 1)}
                                </button>
                            </div>
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
              : "";
    return <span className={`a1-pill ${cls}`}>{status}</span>;
}
