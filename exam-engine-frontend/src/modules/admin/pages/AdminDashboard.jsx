// A2 · Task 1 — Dashboard analytics
// KPIs · L1–L5 distribution ladder · pass-rate donut ·
// attempts-by-stack bars · needs-review queue (Recharts)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { fetchDashboard } from "../services/api";
import "../components/a2.css";

const DONUT_COLORS = ["#1f7a4d", "#b3392f", "#d98a1c"]; // pass / fail / needs review

const getCurrentMonthYM = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("single"); // "single" or "custom"
  const [selectedMonth, setSelectedMonth] = useState("");
  
  // Custom range sub-states
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadDashboard = (activeMode = "all", startYM = "", endYM = "") => {
    setLoading(true);
    let params = {};
    if (activeMode === "single" && startYM) {
      params = { startMonth: startYM, endMonth: startYM };
    } else if (activeMode === "custom" && startYM && endYM) {
      params = { startMonth: startYM, endMonth: endYM };
    }
    fetchDashboard(params).then((res) => {
      if (res) {
        setData(res);
      } else {
        setData({
          kpis: { totalExams: 0, totalAttempts: 0, overallPassRatePercent: 0, avgScorePercent: 0 },
          levelDistribution: [],
          passRateSplit: [],
          attemptsByStack: []
        });
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Failed to load admin dashboard:", err);
      setData({
        kpis: { totalExams: 0, totalAttempts: 0, overallPassRatePercent: 0, avgScorePercent: 0 },
        levelDistribution: [],
        passRateSplit: [],
        attemptsByStack: []
      });
      setLoading(false);
    });
  };

  // On mount: Load all dashboard data by default
  useEffect(() => {
    loadDashboard("all");
  }, []);

  const handleMonthChange = (val) => {
    setSelectedMonth(val);
    if (!val) {
      loadDashboard("all");
    } else {
      setMode("single");
      loadDashboard("single", val);
    }
  };

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) return;
    loadDashboard("custom", customFrom, customTo);
  };

  const handleReset = () => {
    setMode("single");
    setSelectedMonth("");
    setCustomFrom("");
    setCustomTo("");
    loadDashboard("all");
  };

  if (!data) return <div className="a2-page a2-loading">Loading dashboard…</div>;

  const { kpis, levelDistribution, passRateSplit, attemptsByStack } = data;
  const displayLevels = ["L1", "L2", "L3", "L4", "L5"].map((lvl) => {
    const found = levelDistribution?.find((d) => d.level === lvl);
    return {
      level: lvl,
      count: found ? found.count : 0
    };
  });
  const maxLevel = Math.max(...displayLevels.map((d) => d.count), 1);

  const totalAttempts = kpis.totalAttempts || 0;

  return (
    <div className="a2-page">
      {/* Top Header Row with direct Month Calendar Filter aligned to the right */}
      <header 
        className="a2-page-head" 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "22px", color: "var(--a2-navy)" }}>Dashboard Analytics</h1>
          <p className="a2-sub">Attempts, results and integrity review across all stacks</p>
        </div>

        {/* Calendar Picker & Custom Toggle Group */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {mode === "single" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--a2-navy)" }}>Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid var(--a2-line)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "var(--a2-navy)",
                  backgroundColor: "#fff",
                  outline: "none",
                  cursor: "pointer",
                  fontWeight: "600",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"
                }}
              />
              <button
                onClick={handleReset}
                style={{
                  padding: "6px 12px",
                  backgroundColor: !selectedMonth && mode === "single" ? "#2F6BFF" : "#fff",
                  border: "1px solid var(--a2-line)",
                  color: !selectedMonth && mode === "single" ? "#fff" : "var(--a2-navy)",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"
                }}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  setMode("custom");
                  const currentYM = selectedMonth || getCurrentMonthYM();
                  setCustomFrom(currentYM);
                  setCustomTo(currentYM);
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: mode === "custom" ? "#2F6BFF" : "#fff",
                  border: "1px solid var(--a2-line)",
                  color: mode === "custom" ? "#fff" : "var(--a2-navy)",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"
                }}
              >
                Custom Range
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--a2-mut)" }}>From:</span>
              <input
                type="month"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  padding: "6px 8px",
                  border: "1px solid var(--a2-line)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--a2-navy)",
                  backgroundColor: "#fff",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--a2-mut)" }}>To:</span>
              <input
                type="month"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  padding: "6px 8px",
                  border: "1px solid var(--a2-line)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--a2-navy)",
                  backgroundColor: "#fff",
                  outline: "none",
                  cursor: "pointer"
                }}
              />
              <button
                onClick={handleApplyCustom}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#2F6BFF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  boxShadow: "0 1px 2px 0 rgba(47, 107, 255, 0.15)"
                }}
              >
                Apply
              </button>
            </div>
          )}

          <button
            onClick={handleReset}
            style={{
              padding: "6px 12px",
              backgroundColor: "#fff",
              border: "1px solid var(--a2-line)",
              color: "var(--a2-mut)",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)"
            }}
          >
            Reset
          </button>

          {loading && (
            <span style={{ fontSize: "12px", color: "#2F6BFF", fontWeight: "600" }}>
              Updating...
            </span>
          )}
        </div>
      </header>

      <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        {/* KPI row */}
        <div className="a2-kpi-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <Kpi label="Total attempts" value={totalAttempts} />
          <Kpi label="Pass rate" value={`${kpis.passRate}%`} accent="green" />
          <Kpi
            label="Needs review"
            value={kpis.needsReview}
            accent="amber"
            onClick={() => navigate("/admin/review")}
          />
        </div>

        <div className="a2-grid-2">
          {/* L1–L5 distribution ladder */}
          <section className="a2-card">
            <h2 style={{ marginBottom: "16px" }}>Level distribution</h2>
            <div className="a2-ladder">
              {[...displayLevels].reverse().map((d) => (
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
            {totalAttempts === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontSize: "13.5px" }}>
                No result split data for this period
              </div>
            ) : (
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
            )}
          </section>
        </div>

        {/* Attempts by stack */}
        <section className="a2-card" style={{ marginTop: "24px" }}>
          <h2>Attempts by stack</h2>
          {totalAttempts === 0 ? (
            <div style={{ textAlign: "center", color: "#64748b", padding: "60px 0", fontSize: "13.5px" }}>
              No attempts by stack data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attemptsByStack} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stack" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={false} />
                <Legend />
                <Bar dataKey="pass" name="Pass" fill="#1f7a4d" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fail" name="Fail" fill="#b3392f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
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
