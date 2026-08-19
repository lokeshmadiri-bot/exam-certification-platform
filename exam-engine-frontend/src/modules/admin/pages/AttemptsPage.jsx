// A2 · Task 2 — Attempts & Review Queue
// Attempts: Full audit/history page (PASS, FAIL, NEEDS_REVIEW, IN_PROGRESS, etc.)
// Review & Flags: Dedicated review queue (NEEDS_REVIEW & IN_PROGRESS attempts only)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAttempts, fetchReviewAttempts, META } from "../services/api";
import "../components/a2.css";

export default function AttemptsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const isReviewPage = window.location.pathname.includes("/admin/review");

  const filters = {
    stack: params.get("stack") || "",
    level: params.get("level") || "",
    result: params.get("result") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };

  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    setLoading(true);
    const fetchFn = isReviewPage ? fetchReviewAttempts : fetchAttempts;
    fetchFn(filters).then((d) => {
      setData(d?.rows ? d : { rows: Array.isArray(d) ? d : [], total: Array.isArray(d) ? d.length : 0 });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, isReviewPage]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => {
    setParams({}, { replace: true });
  };
  
  const hasFilters = Object.values(filters).some(Boolean);

  const resultOptions = ["PASS", "FAIL", "NEEDS_REVIEW"];

  const resultLabels = {
    PASS: "Pass",
    FAIL: "Fail",
    NEEDS_REVIEW: "Needs review",
  };

  return (
    <div className="a2-page">
      <header className="a2-page-head">
        <h1>{isReviewPage ? "Reviews & Flags" : "Attempts"}</h1>
        <p className="a2-sub">
          {isReviewPage
            ? `${data.total} attempt${data.total === 1 ? "" : "s"} requiring review`
            : `${data.total} attempt${data.total === 1 ? "" : "s"} matching current filters`}
        </p>
      </header>

      {/* Filter bar */}
      <div className="a2-filterbar">
        <Select label="Stack" value={filters.stack} options={META.STACKS} onChange={(v) => setFilter("stack", v)} />
        {!isReviewPage && (
          <Select label="Level" value={filters.level} options={META.LEVELS} onChange={(v) => setFilter("level", v)} />
        )}
        {!isReviewPage && (
          <Select
            label="Status"
            value={filters.result}
            options={resultOptions}
            labels={resultLabels}
            onChange={(v) => setFilter("result", v)}
          />
        )}
        <label className="a2-field">
          <span>From</span>
          <input type="date" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
        </label>
        <label className="a2-field">
          <span>To</span>
          <input type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
        </label>
        {hasFilters && (
          <button className="a2-btn a2-btn-ghost" onClick={clearAll}>Clear filters</button>
        )}
      </div>

      {/* Table */}
      <section className="a2-card">
        {loading ? (
          <div className="a2-loading">Loading attempts…</div>
        ) : data.rows.length === 0 ? (
          <div className="a2-empty">
            {isReviewPage
              ? "No attempts currently require review."
              : "No attempts match these filters. Adjust or clear the filters to see results."}
          </div>
        ) : (
          <table className="a2-table a2-table-hover">
            <thead>
              {isReviewPage ? (
                <tr>
                  <th>Exam</th><th>Candidate</th><th>Stack</th>
                  <th>Status</th><th>Submitted</th>
                </tr>
              ) : (
                <tr>
                  <th>Exam</th><th>Candidate</th><th>Stack</th><th>Level</th>
                  <th>Status</th><th>Score</th><th>Flags</th><th>Submitted</th>
                </tr>
              )}
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    className={isReviewPage ? "a2-clickable" : ""}
                    onClick={() => isReviewPage && setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td>{r.exam}</td>
                    <td>{r.candidate}</td>
                    <td>{r.stack}</td>
                    {!isReviewPage && <td><span className={`a2-pill a2-lvl-${r.level}`}>{r.level}</span></td>}
                    <td><ResultPill result={r.result} /></td>
                    {!isReviewPage && <td>{r.score}</td>}
                    {!isReviewPage && <td>{r.flagCount > 0 ? <span className="a2-pill a2-pill-amber">{r.flagCount}</span> : "—"}</td>}
                    <td>{new Date(r.submittedAt).toLocaleString()}</td>
                  </tr>

                  {/* Row drill-down - Only available on Review & Flags page */}
                  {isReviewPage && expanded === r.id && (
                    <tr className="a2-drill">
                      <td colSpan={5}>
                        <div className="a2-drill-body">
                          <div className="a2-drill-facts">
                            <Fact label="Duration" value={`${r.durationMin || 60} min`} />
                            <Fact label="Integrity flags" value={r.flagCount} />
                            <Fact label="Status" value={(r.result || "").replace("_", " ")} />
                          </div>
                          <div className="a2-drill-actions">
                            <button
                              className="a2-btn a2-btn-primary"
                              onClick={(e) => { e.stopPropagation(); navigate(`/admin/attempts/${r.id}/review`); }}
                            >
                              Open full review
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Select({ label, value, options, labels = {}, onChange }) {
  return (
    <label className="a2-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>{labels[o] || o}</option>
        ))}
      </select>
    </label>
  );
}

function Fact({ label, value }) {
  return (
    <div className="a2-fact">
      <span className="a2-fact-label">{label}</span>
      <span className="a2-fact-value">{value}</span>
    </div>
  );
}

export function ResultPill({ result }) {
  const map = {
    PASS: ["a2-pill-green", "Pass"],
    FAIL: ["a2-pill-red", "Fail"],
    NEEDS_REVIEW: ["a2-pill-amber", "Needs review"],
    IN_PROGRESS: ["a2-pill-amber", "Needs review"],
  };
  const [cls, text] = map[result] || ["", result ? result.replace("_", " ") : "—"];
  return <span className={`a2-pill ${cls}`}>{text}</span>;
}
