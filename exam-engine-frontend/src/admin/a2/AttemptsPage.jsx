// A2 · Task 2 — Attempts
// Table + filters (stack / level / result / date) + row drill-down

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchAttempts, META } from "./api";
import "./a2.css";

export default function AttemptsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

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
    fetchAttempts(filters).then((d) => {
      setData(d?.rows ? d : { rows: Array.isArray(d) ? d : [], total: Array.isArray(d) ? d.length : 0 });
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams({}, { replace: true });
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="a2-page">
      <header className="a2-page-head">
        <h1>Attempts</h1>
        <p className="a2-sub">{data.total} attempt{data.total === 1 ? "" : "s"} matching current filters</p>
      </header>

      {/* Filter bar */}
      <div className="a2-filterbar">
        <Select label="Stack" value={filters.stack} options={META.STACKS} onChange={(v) => setFilter("stack", v)} />
        <Select label="Level" value={filters.level} options={META.LEVELS} onChange={(v) => setFilter("level", v)} />
        <Select
          label="Result"
          value={filters.result}
          options={META.RESULTS}
          labels={{ PASS: "Pass", FAIL: "Fail", NEEDS_REVIEW: "Needs review" }}
          onChange={(v) => setFilter("result", v)}
        />
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
          <div className="a2-empty">No attempts match these filters. Adjust or clear the filters to see results.</div>
        ) : (
          <table className="a2-table a2-table-hover">
            <thead>
              <tr>
                <th>Attempt</th><th>Candidate</th><th>Stack</th><th>Level</th>
                <th>Result</th><th>Score</th><th>Flags</th><th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    className="a2-clickable"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="a2-mono">{r.id}</td>
                    <td>{r.candidate}</td>
                    <td>{r.stack}</td>
                    <td><span className={`a2-pill a2-lvl-${r.level}`}>{r.level}</span></td>
                    <td><ResultPill result={r.result} /></td>
                    <td>{r.score}</td>
                    <td>{r.flagCount > 0 ? <span className="a2-pill a2-pill-amber">{r.flagCount}</span> : "—"}</td>
                    <td>{new Date(r.submittedAt).toLocaleString()}</td>
                  </tr>

                  {/* Row drill-down */}
                  {expanded === r.id && (
                    <tr className="a2-drill">
                      <td colSpan={8}>
                        <div className="a2-drill-body">
                          <div className="a2-drill-facts">
                            <Fact label="Duration" value={`${r.durationMin} min`} />
                            <Fact label="Score" value={`${r.score} / 100`} />
                            <Fact label="Integrity flags" value={r.flagCount} />
                            <Fact label="Result" value={r.result.replace("_", " ")} />
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
  };
  const [cls, text] = map[result] || ["", result];
  return <span className={`a2-pill ${cls}`}>{text}</span>;
}
