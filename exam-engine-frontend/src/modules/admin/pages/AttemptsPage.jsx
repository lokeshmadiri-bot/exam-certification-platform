// A2 · Task 2 — Attempts & Review Queue
// Attempts: Full audit/history page (PASS, FAIL, NEEDS_REVIEW, IN_PROGRESS, etc.)
// Review & Flags: Dedicated review queue (NEEDS_REVIEW & IN_PROGRESS attempts only)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAttempts, fetchReviewAttempts, fetchExams, META } from "../services/api";
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
  const [availableStacks, setAvailableStacks] = useState(META.STACKS);

  useEffect(() => {
    fetchExams().then((res) => {
      const list = res?.rows || (Array.isArray(res) ? res : []);
      const customStacks = list.map(e => e.stack).filter(Boolean);
      setAvailableStacks(Array.from(new Set([...META.STACKS, ...customStacks])));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchFn = isReviewPage ? fetchReviewAttempts : fetchAttempts;
    fetchFn(filters)
      .then((d) => {
        if (isMounted) {
          const rowsList = d?.rows || (Array.isArray(d) ? d : []);
          setData({ rows: rowsList, total: rowsList.length });
        }
      })
      .catch((err) => {
        console.error("Error fetching attempts:", err);
        if (isMounted) {
          setData({ rows: [], total: 0 });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
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

  const resultOptions = ["PASS", "FAIL"];

  const resultLabels = {
    PASS: "Pass",
    FAIL: "Fail",
  };

  const displayRows = useMemo(() => {
    let rows = data.rows || [];

    const reviewStatus = filters.result ? filters.result.toUpperCase() : "";
    if (reviewStatus === "NEEDS_REVIEW") {
      rows = rows.filter((r) => {
        const res = (r.result || "").toUpperCase();
        return res === "NEEDS_REVIEW" || res === "IN_PROGRESS" || !r.isReviewed;
      });
    } else if (reviewStatus === "REVIEWED") {
      rows = rows.filter((r) => {
        const res = (r.result || "").toUpperCase();
        return r.isReviewed || ["CONFIRMED", "REJECTED", "REVIEWED", "PUBLISHED", "PASS", "FAIL"].includes(res);
      });
    } else if (reviewStatus) {
      rows = rows.filter((r) => (r.result || "").toUpperCase() === reviewStatus);
    }

    // Sort: First all Needs Review exams display at the top, then all Reviewed exams display below
    return [...rows].sort((a, b) => {
      const resA = (a.result || "").toUpperCase();
      const resB = (b.result || "").toUpperCase();

      const isReviewedA = a.isReviewed === true || ["CONFIRMED", "REJECTED", "REVIEWED", "PUBLISHED", "PASS", "FAIL"].includes(resA);
      const isReviewedB = b.isReviewed === true || ["CONFIRMED", "REJECTED", "REVIEWED", "PUBLISHED", "PASS", "FAIL"].includes(resB);

      if (!isReviewedA && isReviewedB) return -1;
      if (isReviewedA && !isReviewedB) return 1;

      const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [data.rows, filters.result]);

  return (
    <div className="a2-page">
      <header className="a2-page-head">
        <h1>{isReviewPage ? "Reviews & Flags" : "Attempts"}</h1>
        <p className="a2-sub">
          {isReviewPage
            ? `${displayRows.length} attempt${displayRows.length === 1 ? "" : "s"} ${filters.result === "REVIEWED" ? "reviewed" : (filters.result === "NEEDS_REVIEW" ? "requiring review" : "total")}`
            : `${displayRows.length} attempt${displayRows.length === 1 ? "" : "s"} matching current filters`}
        </p>
      </header>

      {/* Filter bar */}
      <div className="a2-filterbar">
        <Select label="Stack" value={filters.stack} options={availableStacks} onChange={(v) => setFilter("stack", v)} />
        {!isReviewPage && (
          <Select label="Level" value={filters.level} options={META.LEVELS} onChange={(v) => setFilter("level", v)} />
        )}
        {!isReviewPage ? (
          <Select
            label="Status"
            value={filters.result}
            options={resultOptions}
            labels={resultLabels}
            onChange={(v) => setFilter("result", v)}
          />
        ) : (
          <Select
            label="Status"
            value={filters.result}
            options={["NEEDS_REVIEW", "REVIEWED"]}
            labels={{
              NEEDS_REVIEW: "Needs review",
              REVIEWED: "Reviewed",
            }}
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
        ) : displayRows.length === 0 ? (
          <div className="a2-empty">
            {isReviewPage
              ? (filters.result === "REVIEWED" ? "No reviewed attempts found." : "No attempts currently require review.")
              : "No attempts match these filters. Adjust or clear the filters to see results."}
          </div>
        ) : (
          <div className="a2-table-container">
            <table className="a2-table a2-table-hover">
              <thead>
                {isReviewPage ? (
                  <tr>
                    <th>Exam</th><th>Candidate</th><th>Stack</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th>Submitted</th>
                    <th>Reviewed Date</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Exam</th><th>Candidate</th><th>Stack</th><th style={{ textAlign: "center" }}>Level</th>
                    <th style={{ textAlign: "center" }}>Status</th><th style={{ textAlign: "center" }}>Score</th><th style={{ textAlign: "center" }}>Flags</th><th>Submitted</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <React.Fragment key={r.id}>
                    <tr
                      className={isReviewPage ? "a2-clickable" : ""}
                      onClick={() => isReviewPage && setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td>{r.exam}</td>
                      <td>{r.candidate}</td>
                      <td>{r.stack}</td>
                      {!isReviewPage && (
                        <td style={{ textAlign: "center" }}>
                          {["L1", "L2", "L3", "L4", "L5"].includes(r.level) ? (
                            <span className={`a2-pill a2-lvl-${r.level}`}>{r.level}</span>
                          ) : (
                            <span style={{ color: "var(--a2-sub-color)", fontSize: "13px" }}>NA</span>
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: "center" }}>
                        {isReviewPage ? (
                          (filters.result === "REVIEWED" || r.isReviewed || ["CONFIRMED", "ACCEPTED", "REJECTED", "REVIEWED", "PUBLISHED", "PASS", "FAIL"].includes((r.result || "").toUpperCase())) ? (
                            r.adminDecision === "REJECTED" ? (
                              <span className="a2-pill a2-pill-red">Rejected</span>
                            ) : (r.adminDecision === "CONFIRMED" || r.adminDecision === "ACCEPTED") ? (
                              <span className="a2-pill a2-pill-green">Accepted</span>
                            ) : (
                              <span className="a2-pill a2-pill-green">Reviewed</span>
                            )
                          ) : (
                            <span className="a2-pill a2-pill-amber">Needs review</span>
                          )
                        ) : (
                          <ResultPill result={r.adminDecision === "REJECTED" ? "REJECTED" : (r.adminDecision === "CONFIRMED" || r.adminDecision === "ACCEPTED") ? "CONFIRMED" : r.result} />
                        )}
                      </td>
                      {!isReviewPage && <td style={{ textAlign: "center" }}>{r.score}</td>}
                      {!isReviewPage && (
                        <td style={{ textAlign: "center" }}>
                          {(r.flagCount || r.flagsCount || r.flags || 0) > 0 ? (
                            <span className="a2-pill a2-pill-amber">{r.flagCount || r.flagsCount || r.flags}</span>
                          ) : (
                            <span style={{ color: "var(--a2-sub-color)", fontSize: "13px" }}>0</span>
                          )}
                        </td>
                      )}
                      <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}</td>
                      {isReviewPage && (
                        <td>
                          {r.reviewedDate || r.publishedAt ? new Date(r.reviewedDate || r.publishedAt).toLocaleString() : "—"}
                        </td>
                      )}
                    </tr>

                    {/* Row drill-down - Only available on Review & Flags page */}
                    {isReviewPage && expanded === r.id && (
                      <tr className="a2-drill">
                        <td colSpan={6}>
                          <div className="a2-drill-body">
                            <div className="a2-drill-facts">
                              <Fact label="Duration" value={`${r.durationMin || 60} min`} />
                              <Fact label="Integrity flags" value={r.flagCount} />
                              <Fact label="Status" value={
                                r.adminDecision === "REJECTED" ? "Rejected" :
                                (r.adminDecision === "CONFIRMED" || r.adminDecision === "ACCEPTED") ? "Accepted" :
                                (filters.result === "REVIEWED" || r.isReviewed || ["CONFIRMED", "REJECTED", "REVIEWED", "PUBLISHED", "PASS", "FAIL"].includes((r.result || "").toUpperCase())) ? "Reviewed" : "Needs review"
                              } />
                              <Fact label="Submitted date" value={r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"} />
                              <Fact label="Reviewed date" value={r.reviewedDate || r.publishedAt ? new Date(r.reviewedDate || r.publishedAt).toLocaleString() : "—"} />
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
          </div>
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
    REVIEWED: ["a2-pill-green", "Reviewed"],
    CONFIRMED: ["a2-pill-green", "Accepted"],
    ACCEPTED: ["a2-pill-green", "Accepted"],
    REJECTED: ["a2-pill-red", "Rejected"],
    PUBLISHED: ["a2-pill-green", "Reviewed"],
  };
  const upper = (result || "").toUpperCase();
  const [cls, text] = map[upper] || [
    upper === "REJECTED" ? "a2-pill-red" : (upper === "CONFIRMED" || upper === "ACCEPTED" || upper === "REVIEWED" || upper === "PUBLISHED") ? "a2-pill-green" : "",
    upper === "REJECTED" ? "Rejected" : (upper === "CONFIRMED" || upper === "ACCEPTED") ? "Accepted" : (upper === "REVIEWED" || upper === "PUBLISHED") ? "Reviewed" : (result ? result.replace("_", " ") : "—")
  ];
  return <span className={`a2-pill ${cls}`}>{text}</span>;
}
