// A2 · Task 1 — Dashboard analytics
// KPIs · L1–L5 distribution ladder · pass-rate donut ·
// attempts-by-stack bars · needs-review queue (Recharts)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { fetchDashboard } from "./api";
import "./a2.css";

const DONUT_COLORS = ["#1f7a4d", "#b3392f", "#d98a1c"]; // pass / fail / needs review

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard().then(setData);
  }, []);

  if (!data) return <div className="a2-page a2-loading">Loading dashboard…</div>;

  const { kpis, levelDistribution, passRateSplit, attemptsByStack, needsReviewQueue } = data;
  const maxLevel = Math.max(...levelDistribution.map((d) => d.count), 1);

  return (
    <div className="a2-page">
      <header className="a2-page-head">
        <h1>Oversight dashboard</h1>
        <p className="a2-sub">Attempts, results and integrity review across all stacks</p>
      </header>

      {/* KPI row */}
      <div className="a2-kpi-row">
        <Kpi label="Total attempts" value={kpis.totalAttempts} />
        <Kpi label="Pass rate" value={`${kpis.passRate}%`} accent="green" />
        <Kpi
          label="Needs review"
          value={kpis.needsReview}
          accent="amber"
          onClick={() => navigate("/admin/attempts?result=NEEDS_REVIEW")}
        />
        <Kpi label="Avg. duration" value={`${kpis.avgDurationMin} min`} />
      </div>

      <div className="a2-grid-2">
        {/* L1–L5 distribution ladder */}
        <section className="a2-card">
          <h2>Level distribution</h2>
          <div className="a2-ladder">
            {[...levelDistribution].reverse().map((d) => (
              <div key={d.level} className="a2-ladder-row">
                <span className="a2-ladder-label">{d.level}</span>
                <div className="a2-ladder-track">
                  <div
                    className="a2-ladder-fill"
                    style={{ width: `${(d.count / maxLevel) * 100}%` }}
                  />
                </div>
                <span className="a2-ladder-count">{d.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pass-rate donut */}
        <section className="a2-card">
          <h2>Result split</h2>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={passRateSplit}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
              >
                {passRateSplit.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* Attempts by stack */}
      <section className="a2-card">
        <h2>Attempts by stack</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={attemptsByStack} barCategoryGap={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="stack" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pass" name="Pass" stackId="a" fill="#1f7a4d" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fail" name="Fail" stackId="a" fill="#b3392f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Needs-review queue */}
      <section className="a2-card">
        <div className="a2-card-head">
          <h2>Needs-review queue</h2>
          <button
            className="a2-btn a2-btn-ghost"
            onClick={() => navigate("/admin/attempts?result=NEEDS_REVIEW")}
          >
            View all
          </button>
        </div>
        <table className="a2-table">
          <thead>
            <tr>
              <th>Exam</th><th>Candidate</th><th>Stack</th><th>Level</th>
              <th>Flags</th><th>Flagged at</th><th />
            </tr>
          </thead>
          <tbody>
            {needsReviewQueue.map((q) => (
              <tr key={q.id}>
                <td>{q.exam}</td>
                <td>{q.candidate}</td>
                <td>{q.stack}</td>
                <td><span className={`a2-pill a2-lvl-${q.level}`}>{q.level}</span></td>
                <td><span className="a2-pill a2-pill-amber">{q.flagCount}</span></td>
                <td>{new Date(q.flaggedAt).toLocaleString()}</td>
                <td>
                  <button
                    className="a2-btn a2-btn-primary a2-btn-sm"
                    onClick={() => navigate(`/admin/attempts/${q.id}/review`)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent, onClick }) {
  return (
    <div
      className={`a2-kpi ${accent ? `a2-kpi-${accent}` : ""} ${onClick ? "a2-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="a2-kpi-value">{value}</div>
      <div className="a2-kpi-label">{label}</div>
    </div>
  );
}
