// // A1 · Task 5 — Candidates
// // Table (name/email/exam/status/locked/last attempt) · filters ·
// // 30-day lock override, gated behind four-eyes approval.

// import React, { useEffect, useMemo, useState } from "react";
// import { fetchCandidates, fetchExams, requestCandidateLockOverride } from "../services/api";
// import { TwoPersonRuleBanner, PendingApprovalBadge, RequestApprovalModal } from "../components/FourEyes";
// import "../components/a1.css";

// const PAGE_SIZE = 8;

// const STATUS_LABEL = {
//     COMPLETED: "Completed",
//     IN_PROGRESS: "In progress",
//     NOT_STARTED: "Not started",
// };

// export default function CandidatesPage() {
//     const [rows, setRows] = useState(null);
//     const [allExams, setAllExams] = useState([]);
//     const [filters, setFilters] = useState({ q: "", status: "", exam: "", locked: "" });
//     const [page, setPage] = useState(1);
//     const [overrideFor, setOverrideFor] = useState(null); // candidate object

//     const load = () => {
//         fetchCandidates(filters).then((res) => setRows(res?.rows || res || []));
//         fetchExams().then((res) => {
//             const examsList = res?.rows || res || [];
//             setAllExams(examsList.map((e) => e.title || e.name || e));
//         }).catch(() => {});
//     };

//     useEffect(() => {
//         load();
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [filters]);

//     const examOptions = useMemo(() => {
//         const fromCandidates = rows ? rows.map((c) => c.examTitle).filter(Boolean) : [];
//         const combined = [...new Set([...allExams, ...fromCandidates])];
//         return combined.sort();
//     }, [rows, allExams]);

//     const pageRows = useMemo(() => {
//         if (!rows) return [];
//         const start = (page - 1) * PAGE_SIZE;
//         return rows.slice(start, start + PAGE_SIZE);
//     }, [rows, page]);

//     const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;

//     const submitOverride = async (note) => {
//         await requestCandidateLockOverride(overrideFor.candidateId, note);
//         setOverrideFor(null);
//         load();
//     };

//     return (
//         <div className="a1-page">
//             <header className="a1-page-head">
//                 <div>
//                     <h1>Candidates</h1>
//                     <p className="a1-sub">Review candidate status and manage 30-day lock overrides.</p>
//                 </div>
//                 <button className="a1-btn a1-btn-ghost" onClick={load}>↻ Refresh</button>
//             </header>

//             <TwoPersonRuleBanner text="Overriding a candidate's 30-day lock requires approval from a second administrator." />

//             <div className="a1-filterbar">
//                 <div className="a1-field">
//                     <label>Search</label>
//                     <input
//                         placeholder="Name or email"
//                         value={filters.q}
//                         onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }}
//                     />
//                 </div>
//                 <div className="a1-field">
//                     <label>Status</label>
//                     <select value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
//                         <option value="">All statuses</option>
//                         <option value="COMPLETED">Completed</option>
//                         <option value="IN_PROGRESS">In progress</option>
//                         <option value="NOT_STARTED">Not started</option>
//                     </select>
//                 </div>
//                 <div className="a1-field">
//                     <label>Exam</label>
//                     <select value={filters.exam} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, exam: e.target.value })); }}>
//                         <option value="">All exams</option>
//                         {examOptions.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
//                     </select>
//                 </div>
//                 <div className="a1-field">
//                     <label>Locked</label>
//                     <select value={filters.locked} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, locked: e.target.value })); }}>
//                         <option value="">All</option>
//                         <option value="true">Locked</option>
//                         <option value="false">Not locked</option>
//                     </select>
//                 </div>
//             </div>

//             {!rows ? (
//                 <div className="a1-loading">Loading candidates…</div>
//             ) : rows.length === 0 ? (
//                 <div className="a1-empty">No candidates match your filters.</div>
//             ) : (
//                 <table className="a1-table a1-table-hover">
//                     <thead>
//                         <tr>
//                             <th>Name</th><th>Email</th><th>Exam</th><th>Status</th><th>Locked</th><th>Last Attempt</th><th />
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {pageRows.map((c) => (
//                             <tr key={`${c.candidateId}-${c.examId}`}>
//                                 <td>{c.candidateName}</td>
//                                 <td className="a1-mono">{c.email}</td>
//                                 <td>{c.examTitle}</td>
//                                 <td><span className="a1-pill">{STATUS_LABEL[c.status] || c.status}</span></td>
//                                 <td>
//                                     {c.locked ? (
//                                         <>
//                                             <span className="a1-pill a1-pill-red">Locked</span>
//                                             {c.lockedUntil && <div className="a1-approval-meta">until {new Date(c.lockedUntil).toLocaleDateString()}</div>}
//                                         </>
//                                     ) : (
//                                         <span className="a1-pill a1-pill-green">Unlocked</span>
//                                     )}
//                                     {c.pendingApproval && <> <PendingApprovalBadge /></>}
//                                 </td>
//                                 <td>{c.lastAttempt ? new Date(c.lastAttempt).toLocaleDateString() : "—"}</td>
//                                 <td>
//                                     {c.locked && (
//                                         <button
//                                             className="a1-btn a1-btn-amber a1-btn-sm"
//                                             disabled={!!c.pendingApproval}
//                                             onClick={() => setOverrideFor(c)}
//                                         >
//                                             Override Lock
//                                         </button>
//                                     )}
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             )}

//             {rows && rows.length > PAGE_SIZE && (
//                 <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
//                     <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
//                     <span className="a1-sub">Page {page} of {totalPages}</span>
//                     <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
//                 </div>
//             )}

//             <RequestApprovalModal
//                 open={!!overrideFor}
//                 title={overrideFor ? `Override lock for ${overrideFor.candidateName}?` : ""}
//                 description="The candidate becomes able to attempt the exam again once a second administrator approves this request."
//                 confirmLabel="Request unlock"
//                 tone="amber"
//                 onCancel={() => setOverrideFor(null)}
//                 onConfirm={submitOverride}
//             />
//         </div>
//     );
// }

// A1 · Task 5 — Candidates
// Table (name/email/exam/status/locked/last attempt) · filters ·
// 30-day lock override, gated behind four-eyes approval.

import React, { useEffect, useMemo, useState } from "react";
import { fetchCandidates, fetchExams, approveCandidateOverride } from "../services/api";
import { RequestApprovalModal } from "../components/FourEyes";
import "../components/a1.css";

const PAGE_SIZE = 10;

const STATUS_PILL = {
    IN_PROGRESS: { label: "In Progress", cls: "a1-pill-blue" },
    SUBMITTED:   { label: "Submitted",   cls: "a1-pill-amber" },
    PASSED:      { label: "Passed",      cls: "a1-pill-green" },
    FAILED:      { label: "Failed",      cls: "a1-pill-red" },
    TERMINATED:  { label: "Terminated",  cls: "a1-pill-red" },
    NOT_STARTED: { label: "Not Started", cls: "" },
};

const LOCK_PILL = {
    LOCKED:            { icon: "🔒", label: "Locked",           cls: "a1-pill-red" },
    UNLOCKED:          { icon: "🔓", label: "Unlocked",          cls: "a1-pill-green" },
    OVERRIDE_APPROVED: { icon: "🔓",  label: "Override Unlocked", cls: "a1-pill-green" },
};

function fmtDate(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export default function CandidatesPage() {
    const [rows, setRows] = useState(null);
    const [allExams, setAllExams] = useState([]);
    const [filters, setFilters] = useState({ q: "", status: "", exam: "", locked: "" });
    const [page, setPage] = useState(1);
    const [overrideFor, setOverrideFor] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const [feedbackModal, setFeedbackModal] = useState(null);

    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const load = async () => {
        try {
            const [res, exams] = await Promise.all([
                fetchCandidates(filters),
                fetchExams().catch(() => ({ rows: [] }))
            ]);
            setRows(res?.rows || res || []);
            const examsList = exams?.rows || exams || [];
            setAllExams(examsList.map((e) => e.title || e.name || e));
        } catch (e) {
            setRows([]);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const examOptions = useMemo(() => {
        const fromCandidates = rows ? rows.map((c) => c.examTitle).filter(Boolean) : [];
        const combined = [...new Set([...allExams, ...fromCandidates])];
        return combined.sort();
    }, [rows, allExams]);

    const pageRows = useMemo(() => {
        if (!rows) return [];
        const start = (page - 1) * PAGE_SIZE;
        return rows.slice(start, start + PAGE_SIZE);
    }, [rows, page]);

    const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;

    const submitOverride = async () => {
        const cId = overrideFor?.candidateId || overrideFor?.userId || overrideFor?.id;
        const eId = overrideFor?.examId;
        if (!cId) {
            setFeedbackModal({
                title: "Unlock Failed",
                message: "Candidate ID is missing.",
                isError: true
            });
            return;
        }
        try {
            await approveCandidateOverride(cId, eId);
            setToastMessage(`Candidate "${overrideFor?.candidateName || 'Candidate'}" unlocked successfully.`);
        } catch (err) {
            console.error("Override lock error:", err);
            setFeedbackModal({
                title: "Unlock Failed",
                message: err?.message || "Failed to unlock candidate. Please try again.",
                isError: true
            });
        } finally {
            setOverrideFor(null);
            await load();
        }
    };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Candidates</h1>
                    <p className="a1-sub">Review all exam attempts, candidate responses, and lock status in real time.</p>
                </div>
            </header>

            {toastMessage && (
                <div className="a1-banner a1-banner-green" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "10px", padding: "12px 18px" }}>
                    <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>✓</span> {toastMessage}
                    </span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" onClick={() => setToastMessage(null)} style={{ border: "none", background: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
                </div>
            )}

            <div className="a1-filterbar">
                <div className="a1-field">
                    <label>Search</label>
                    <input
                        placeholder="Name or email"
                        value={filters.q}
                        onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }}
                    />
                </div>
                <div className="a1-field">
                    <label>Access</label>
                    <select value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
                        <option value="">All access status</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="PASSED">Passed</option>
                        <option value="FAILED">Failed</option>
                        <option value="TERMINATED">Terminated</option>
                        <option value="NOT_STARTED">Not Started</option>
                    </select>
                </div>
                <div className="a1-field">
                    <label>Exam</label>
                    <select value={filters.exam} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, exam: e.target.value })); }}>
                        <option value="">All exams</option>
                        {examOptions.map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                </div>
                <div className="a1-field">
                    <label>Override Lock</label>
                    <select value={filters.locked} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, locked: e.target.value })); }}>
                        <option value="">All</option>
                        <option value="true">Locked</option>
                        <option value="false">Unlocked / Approved</option>
                    </select>
                </div>
            </div>

            {!rows ? (
                <div className="a1-loading">Loading candidates…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No candidates match your filters.</div>
            ) : (
                <div className="a1-table-container">
                    <table className="a1-table a1-table-hover">
                        <thead>
                            <tr>
                                <th>Candidate</th>
                                <th>Email</th>
                                <th>Exam</th>
                                <th style={{ textAlign: "center" }}>Access</th>
                                <th>Attempted Date</th>
                                <th>Duration</th>
                                <th style={{ textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map((c, i) => {
                                const statusInfo = STATUS_PILL[c.status] || { label: c.status, cls: "" };
                                const lockInfo   = LOCK_PILL[c.overrideLockStatus] || LOCK_PILL[c.locked ? "LOCKED" : "UNLOCKED"];
                                return (
                                    <tr key={`${c.candidateId}-${c.attemptId || i}`}>
                                        <td style={{ fontWeight: 600 }}>{c.candidateName}</td>
                                        <td className="a1-mono" style={{ fontSize: 12 }}>{c.email}</td>
                                        <td>{c.examTitle}</td>
                                        <td style={{ textAlign: "center" }}>
                                            <span
                                                className={`a1-pill ${lockInfo.cls}`}
                                                style={{
                                                    justifyContent: "center",
                                                    whiteSpace: "nowrap",
                                                    gap: "4px",
                                                }}
                                            >
                                                <span style={{ fontSize: 13, lineHeight: 1 }}>{lockInfo.icon}</span>
                                                <span>{lockInfo.label}</span>
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(c.startTime || c.lastAttempt || c.endTime)}</td>
                                        <td>
                                            {c.durationMinutes ? `${c.durationMinutes} min` : "—"}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {c.locked ? (
                                                <button
                                                    className="a1-btn a1-btn-amber a1-btn-sm"
                                                    style={{ cursor: "pointer", opacity: 1 }}
                                                    onClick={() => setOverrideFor(c)}
                                                >
                                                    Override Lock
                                                </button>
                                            ) : (
                                                <span style={{ color: "var(--a1-mut)", fontSize: 14 }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {rows && rows.length > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 16 }}>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                    <span className="a1-sub">Page {page} of {totalPages}</span>
                    <button className="a1-btn a1-btn-ghost a1-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
            )}

            <RequestApprovalModal
                open={!!overrideFor}
                title={overrideFor ? `Override lock for ${overrideFor.candidateName}?` : ""}
                description="This will immediately remove the 30-day retry lock for this certification exam."
                confirmLabel="Approve Override"
                tone="amber"
                onCancel={() => setOverrideFor(null)}
                onConfirm={submitOverride}
            />

            {feedbackModal && (
                <div className="a1-modal-overlay" onClick={() => setFeedbackModal(null)}>
                    <div className="a1-modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(450px, 92vw)", borderRadius: "16px", padding: "24px" }}>
                        <h3 style={{ fontSize: "19px", fontWeight: 700, color: feedbackModal.isError ? "var(--a1-red)" : "var(--a1-navy)", margin: "0 0 10px 0" }}>
                            {feedbackModal.title}
                        </h3>
                        <p style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--a1-mut)", margin: "0 0 20px 0" }}>
                            {feedbackModal.message}
                        </p>
                        <div className="a1-modal-actions" style={{ display: "flex", justifyContent: "flex-end" }}>
                            <button className="a1-btn a1-btn-primary" onClick={() => setFeedbackModal(null)} style={{ borderRadius: "10px", padding: "8px 20px" }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}