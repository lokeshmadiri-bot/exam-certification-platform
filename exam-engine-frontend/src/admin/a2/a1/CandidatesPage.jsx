// A1 · Task 5 — Candidates
// Table (name/email/exam/status/locked/last attempt) · filters ·
// 30-day lock override, gated behind four-eyes approval.
 
import React, { useEffect, useMemo, useState } from "react";
import { fetchCandidates, fetchExams, approveCandidateOverride } from "./api";
import { RequestApprovalModal } from "./FourEyes";
import "./a1.css";
 
const PAGE_SIZE = 8;
 
const STATUS_LABEL = {
    PASSED: "Passed",
    FAILED: "Failed",
    TERMINATED: "Terminated",
    IN_PROGRESS: "In Progress",
    NOT_STARTED: "Not Started",
};
 
export default function CandidatesPage() {
    const [rows, setRows] = useState(null);
    const [allExams, setAllExams] = useState([]);
    const [filters, setFilters] = useState({ q: "", status: "", exam: "", locked: "" });
    const [page, setPage] = useState(1);
    const [overrideFor, setOverrideFor] = useState(null); // candidate object
 
    const load = async () => {
        const res = await fetchCandidates(filters);
        setRows(res?.rows || res || []);
 
        try {
            const exams = await fetchExams();
            const examsList = exams?.rows || exams || [];
            setAllExams(examsList.map((e) => e.title || e.name || e));
        } catch (e) { }
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
        console.log("Override For:", overrideFor);
        await approveCandidateOverride(
            overrideFor.candidateId,
            overrideFor.examId
        );
        alert("Candidate unlocked successfully.");
 
        setOverrideFor(null);
        await load();
    };
 
    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Candidates</h1>
                    <p className="a1-sub">Review candidate status and manage 30-day lock overrides.</p>
                </div>
                <button className="a1-btn a1-btn-ghost" onClick={load}>↻ Refresh</button>
            </header>
 
 
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
                    <label>Status</label>
                    <select value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }}>
                        <option value="">All statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="NOT_STARTED">Not started</option>
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
                    <label>Locked</label>
                    <select value={filters.locked} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, locked: e.target.value })); }}>
                        <option value="">All</option>
                        <option value="true">Locked</option>
                        <option value="false">Not locked</option>
                    </select>
                </div>
            </div>
 
            {!rows ? (
                <div className="a1-loading">Loading candidates…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No candidates match your filters.</div>
            ) : (
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr>
                            <th>Name</th><th>Email</th><th>Exam</th><th>Status</th><th>Locked</th><th>Last Attempt</th><th />
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((c) => (
                            <tr key={`${c.candidateId}-${c.examId}`}>
                                <td>{c.candidateName}</td>
                                <td className="a1-mono">{c.email}</td>
                                <td>{c.examTitle}</td>
                                <td><span className="a1-pill">{STATUS_LABEL[c.status] || c.status}</span></td>
                                <td>
                                    {c.locked ? (
                                        <>
                                            <span className="a1-pill a1-pill-red">Locked</span>
                                        </>
                                    ) : (
                                        <span className="a1-pill a1-pill-green">Unlocked</span>
                                    )}
                                </td>
                                <td>{c.lastAttempt ? new Date(c.lastAttempt).toLocaleDateString() : "—"}</td>
                                <td>
                                    {c.locked && (
                                        <button
                                            className="a1-btn a1-btn-amber a1-btn-sm"
                                            onClick={() => setOverrideFor(c)}
                                        >
                                            Override Lock
                                        </button>
                                    )}
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
 
            <RequestApprovalModal
                open={!!overrideFor}
                title={overrideFor ? `Override lock for ${overrideFor.candidateName}?` : ""}
                description="This will immediately remove the 30-day retry lock for this certification exam."
                confirmLabel="Approve Override"
                tone="amber"
                onCancel={() => setOverrideFor(null)}
                onConfirm={submitOverride}
            />
        </div>
    );
}