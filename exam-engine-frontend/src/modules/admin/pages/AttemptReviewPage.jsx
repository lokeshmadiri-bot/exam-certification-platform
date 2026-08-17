// Admin Attempt Review Page
// Video playback + integrity timeline with screenshots + decision flow

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchAttempt, fetchRecordingUrl, fetchFlags, fetchScore,
  confirmResult, escalateForSecondReview,
} from "../services/api";
import { ResultPill } from "./AttemptsPage";

export default function AttemptReviewPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [attempt, setAttempt] = useState(null);
  const [recording, setRecording] = useState(null);
  const [flags, setFlags] = useState(null);
  const [score, setScore] = useState(null);
  const [activeFlag, setActiveFlag] = useState(null);
  const [decision, setDecision] = useState({ open: null, note: "", busy: false, done: null });
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  useEffect(() => {
    fetchAttempt(attemptId).then(setAttempt);
    fetchRecordingUrl(attemptId).then(setRecording);
    fetchFlags(attemptId).then(setFlags);
    fetchScore(attemptId).then(setScore);
  }, [attemptId]);

  const seekTo = (tSec, flagId) => {
    setActiveFlag(flagId);
    if (videoRef.current) {
      videoRef.current.currentTime = tSec;
      videoRef.current.play().catch(() => { });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => {
          console.warn("Failed to play video via click:", err);
        });
      } else {
        videoRef.current.pause();
      }
    }
  };

  const submitDecision = async () => {
    setDecision((d) => ({ ...d, busy: true }));
    const payload = { note: decision.note, decidedAt: new Date().toISOString() };
    const fn = decision.open === "confirm" ? confirmResult : escalateForSecondReview;
    const res = await fn(attemptId, payload);
    setDecision({ open: null, note: "", busy: false, done: res.status });
    setTimeout(() => {
      navigate("/admin/attempts");
    }, 1500);
  };

  const fmtTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getFullVideoUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const apiHost = import.meta.env.VITE_API_HOST || "http://localhost:8080";
    const prefix = apiHost.endsWith("/") ? apiHost.slice(0, -1) : apiHost;
    const path = url.startsWith("/") ? url : "/" + url;
    return prefix + path;
  };

  const getSeverityColor = (severity) => {
    if (severity === "HIGH") return { bg: "rgba(224,79,79,0.1)", border: "rgba(224,79,79,0.35)", text: "#E04F4F", dot: "#E04F4F" };
    if (severity === "MEDIUM") return { bg: "rgba(242,169,59,0.1)", border: "rgba(242,169,59,0.3)", text: "#F2A93B", dot: "#F2A93B" };
    return { bg: "rgba(90,109,140,0.1)", border: "rgba(90,109,140,0.3)", text: "#8A99AE", dot: "#8A99AE" };
  };

  if (!attempt) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px", color: "#8A99AE" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#2F6BFF", animation: "spin 0.75s linear infinite" }} />
        <span style={{ fontSize: "13px", fontFamily: "monospace" }}>Loading attempt review…</span>
      </div>
    );
  }

  const sortedFlags = flags?.items ? [...flags.items].sort((a, b) => (a.tSec || 0) - (b.tSec || 0)) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0", minHeight: "100vh", backgroundColor: "#060F1D" }}>

      {/* ── Page Header ── */}
      <div style={{
        padding: "20px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backgroundColor: "#080F1C",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate("/admin/attempts")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#8A99AE", fontSize: "12.5px", fontWeight: "600",
              cursor: "pointer", transition: "all 0.18s ease"
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#8A99AE"; e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
          >
            ← Attempts
          </button>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#4a6a9e", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "3px" }}>
              ATTEMPT REVIEW
            </div>
            <h1 style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", margin: 0, letterSpacing: "-0.2px" }}>
              {attempt.exam || attempt.examTitle || "Exam Attempt"} · {attempt.candidate || "Candidate"} · {attempt.stack} · {attempt.level}
            </h1>
            <div style={{ fontSize: "11.5px", color: "#4a6a9e", fontFamily: "monospace", marginTop: "2px" }}>
              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "—"}
            </div>
          </div>
        </div>
        <ResultPill result={attempt.result} />
      </div>

      {/* ── Decision done banner ── */}
      {decision.done && (
        <div style={{
          padding: "12px 28px",
          backgroundColor: decision.done === "CONFIRMED" ? "rgba(14,159,110,0.12)" : "rgba(242,169,59,0.12)",
          borderBottom: `1px solid ${decision.done === "CONFIRMED" ? "rgba(14,159,110,0.3)" : "rgba(242,169,59,0.3)"}`,
          color: decision.done === "CONFIRMED" ? "#34d27b" : "#F2A93B",
          fontSize: "13px", fontWeight: "600"
        }}>
          {decision.done === "CONFIRMED"
            ? "✓ Result confirmed. The candidate record has been updated."
            : "⚡ Escalated. A second reviewer has been requested — result stays pending."}
        </div>
      )}

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", flex: 1, minHeight: 0 }}>

        {/* ─ Left: Video + timeline ─ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px 20px 24px 28px", overflow: "auto" }}>

          {/* Video Player */}
          <div style={{ maxWidth: "720px", width: "100%", margin: "0 auto", backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: "10px"
            }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#E04F4F" }} />
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#4a6a9e", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Proctored Recording
              </span>

            </div>

            {recording?.url ? (
              <video
                key={recording.url}
                ref={videoRef}
                controls
                preload="auto"
                onClick={togglePlay}
                onTimeUpdate={e => setVideoTime(e.target.currentTime)}
                onLoadedMetadata={e => {
                  let dur = e.target.duration;
                  if (dur === Infinity || isNaN(dur)) {
                    if (recording.startedAt && recording.endedAt) {
                      const diffMs = new Date(recording.endedAt).getTime() - new Date(recording.startedAt).getTime();
                      if (diffMs > 0) dur = diffMs / 1000;
                    }
                  }
                  setVideoDuration(dur);
                }}
                style={{ width: "100%", height: "auto", aspectRatio: "1.3333 / 1", maxHeight: "360px", objectFit: "contain", backgroundColor: "#000", display: "block", cursor: "pointer" }}
              >
                <source src={getFullVideoUrl(recording.url)} type="video/webm" />
                Your browser does not support HTML5 WebM video.
              </video>
            ) : (
              <div style={{
                height: "300px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: "12px",
                color: "#3d5470", backgroundColor: "#050d1a"
              }}>
                <div style={{ fontSize: "32px" }}>📹</div>
                <div style={{ fontSize: "13px", fontFamily: "monospace" }}>
                  {recording === null ? "Loading recording…" : "Recording not yet available"}
                </div>
                {recording?.status && (
                  <div style={{ fontSize: "11px", color: "#2d4060", fontFamily: "monospace" }}>Status: {recording.status}</div>
                )}
              </div>
            )}

            {/* Scrub timeline bar */}
            {videoDuration > 0 && (
              <div style={{ padding: "10px 18px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ position: "relative", height: "4px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "2px", cursor: "pointer" }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    if (videoRef.current) videoRef.current.currentTime = pct * videoDuration;
                  }}
                >
                  <div style={{ height: "100%", borderRadius: "2px", backgroundColor: "#2F6BFF", width: `${(videoTime / videoDuration) * 100}%`, pointerEvents: "none" }} />
                  {/* Violation markers */}
                  {sortedFlags.map(f => (
                    <div
                      key={f.id}
                      title={`${f.type?.replace(/_/g, " ")} @ ${fmtTime(f.tSec)}`}
                      onClick={e => { e.stopPropagation(); seekTo(f.tSec, f.id); }}
                      style={{
                        position: "absolute", top: "-4px",
                        left: `${Math.min(((f.tSec || 0) / videoDuration) * 100, 98)}%`,
                        width: "3px", height: "12px",
                        backgroundColor: f.severity === "HIGH" ? "#E04F4F" : f.severity === "MEDIUM" ? "#F2A93B" : "#4a6a9e",
                        borderRadius: "1px", cursor: "pointer",
                        transform: "translateX(-50%)"
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "10px", color: "#3d5470", fontFamily: "monospace" }}>
                  <span>{fmtTime(videoTime)}</span>
                  <span>{fmtTime(videoDuration)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Integrity Timeline */}
          <div style={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h2 style={{ fontSize: "13.5px", fontWeight: "700", color: "#e8eefb", margin: 0 }}>
                Integrity Timeline
                {flags?.items && (
                  <span style={{ marginLeft: "10px", fontSize: "11px", fontFamily: "monospace", color: "#4a6a9e" }}>
                    {flags.items.length} event{flags.items.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
            </div>

            {/* Taxonomy chips */}
            {flags?.taxonomy && (
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {flags.taxonomy.map(t => {
                  const count = flags.items?.filter(f => f.type === t).length || 0;
                  return (
                    <span key={t} style={{
                      padding: "4px 10px", borderRadius: "999px",
                      fontSize: "10px", fontFamily: "monospace", fontWeight: "600",
                      textTransform: "lowercase",
                      backgroundColor: count ? "rgba(224,79,79,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${count ? "rgba(224,79,79,0.3)" : "rgba(255,255,255,0.07)"}`,
                      color: count ? "#E04F4F" : "#3d5470"
                    }}>
                      {t.replace(/_/g, " ")} {count ? `· ${count}` : ""}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Flag cards */}
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {!flags ? (
                <div style={{ color: "#3d5470", fontSize: "13px", textAlign: "center", padding: "32px 0", fontFamily: "monospace" }}>
                  Loading flags…
                </div>
              ) : sortedFlags.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "32px 0", color: "#34d27b", fontSize: "13px",
                  backgroundColor: "rgba(52,210,123,0.06)", borderRadius: "12px", border: "1px solid rgba(52,210,123,0.15)"
                }}>
                  ✓ No integrity violations flagged for this attempt.
                </div>
              ) : sortedFlags.map(f => {
                const sev = getSeverityColor(f.severity);
                const isActive = activeFlag === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => seekTo(f.tSec, f.id)}
                    style={{
                      display: "flex", gap: "14px", alignItems: "flex-start",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      backgroundColor: isActive ? "rgba(47,107,255,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isActive ? "rgba(47,107,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer", transition: "all 0.15s ease"
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)"; }}
                  >
                    {/* Screenshot thumbnail */}
                    <div style={{
                      width: "100px", height: "75px", borderRadius: "8px", flexShrink: 0,
                      backgroundColor: "#050d1a", border: "1px solid rgba(255,255,255,0.08)",
                      overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {f.thumbnail ? (
                        <img
                          src={f.thumbnail}
                          alt={`Screenshot at ${fmtTime(f.tSec)}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ fontSize: "20px", color: "#1e3050" }}>📷</div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: "700", color: "#2F6BFF" }}>
                          {fmtTime(f.tSec)}
                        </span>
                        <span style={{
                          fontSize: "10px", fontWeight: "700", fontFamily: "monospace",
                          padding: "2px 8px", borderRadius: "6px",
                          backgroundColor: sev.bg, border: `1px solid ${sev.border}`, color: sev.text
                        }}>
                          {f.severity}
                        </span>
                        <span style={{ fontSize: "12.5px", fontWeight: "700", color: "#c5d8ef", textTransform: "capitalize" }}>
                          {f.type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#5a7a9e", lineHeight: "1.5", marginBottom: "8px" }}>
                        {f.note || f.description || "Integrity event recorded."}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(f.tSec, f.id);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          fontSize: "11px", fontWeight: "600", color: "#4a6a9e",
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          fontFamily: "monospace"
                        }}
                      >
                        ▸ Jump to {fmtTime(f.tSec)} in video
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─ Right: Score + Decision ─ */}
        <div style={{
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          display: "flex", flexDirection: "column", gap: "16px",
          padding: "24px 20px 24px 20px",
          backgroundColor: "#070e1b",
          overflow: "auto"
        }}>
          {/* Score card */}
          <div style={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#e8eefb", margin: 0 }}>Score</h2>
              <span style={{
                fontSize: "10px", fontFamily: "monospace", fontWeight: "700",
                color: "#2F6BFF", backgroundColor: "rgba(47,107,255,0.1)",
                border: "1px solid rgba(47,107,255,0.2)",
                padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase"
              }}>
                Admin only
              </span>
            </div>

            {!score ? (
              <div style={{ color: "#3d5470", fontSize: "12px", fontFamily: "monospace", textAlign: "center", padding: "20px 0" }}>Loading…</div>
            ) : (
              <>
                <div style={{ fontSize: "42px", fontWeight: "800", color: "#ffffff", fontFamily: "monospace", lineHeight: 1.1, marginBottom: "4px" }}>
                  {score.total}
                  <span style={{ fontSize: "18px", color: "#3d5470", fontWeight: "500" }}> / {score.maxTotal}</span>
                </div>
                <div style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "2px", marginBottom: "16px", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "2px", backgroundColor: "#2F6BFF", width: `${Math.round((score.total / score.maxTotal) * 100)}%` }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {score.sections?.map(s => (
                    <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                      <span style={{ color: "#6a8ab0" }}>{s.name}</span>
                      <span style={{ fontFamily: "monospace", fontWeight: "700", color: "#c5d8ef" }}>{s.score}/{s.max}</span>
                    </div>
                  ))}
                </div>
                {(score.level || (attempt.level && attempt.level !== "—")) && (
                  <div style={{
                    marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)",
                    fontSize: "12px", color: "#4a6a9e", display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <span>Assigned Level</span>
                    <span className={`a2-pill a2-lvl-${score.level || attempt.level}`} style={{ fontFamily: "monospace", fontWeight: "700" }}>
                      {score.level || attempt.level}
                    </span>
                  </div>
                )}
                <div style={{
                  marginTop: (score.level || (attempt.level && attempt.level !== "—")) ? "10px" : "16px",
                  paddingTop: (score.level || (attempt.level && attempt.level !== "—")) ? "0" : "14px",
                  borderTop: (score.level || (attempt.level && attempt.level !== "—")) ? "none" : "1px solid rgba(255,255,255,0.06)",
                  fontSize: "12px", color: "#4a6a9e", display: "flex", alignItems: "center", justifyContent: "space-between"
                }}>
                  <span>Auto result</span>
                  <ResultPill result={score.autoResult} />
                </div>
              </>
            )}
          </div>

          {/* Flags summary */}
          {flags?.items && (
            <div style={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px" }}>
              <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#e8eefb", margin: "0 0 12px" }}>Violations Summary</h2>
              {[...new Map(flags.items.map(f => [f.type, f])).values()].map(f => {
                const count = flags.items.filter(x => x.type === f.type).length;
                const sev = getSeverityColor(f.severity);
                return (
                  <div key={f.type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "12.5px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: sev.dot, flexShrink: 0 }} />
                      <span style={{ color: "#8A99AE", textTransform: "capitalize" }}>{f.type?.replace(/_/g, " ")}</span>
                    </div>
                    <span style={{ fontFamily: "monospace", fontWeight: "700", color: sev.text }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Decision */}
          <div style={{ backgroundColor: "#0a1628", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "18px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", color: "#e8eefb", margin: "0 0 8px" }}>Decision</h2>
            <p style={{ fontSize: "12px", color: "#4a6a9e", lineHeight: "1.6", margin: "0 0 16px" }}>
              Confirm the auto result, or escalate for a second reviewer when flags are ambiguous.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                disabled={!!decision.done}
                onClick={() => setDecision(d => ({ ...d, open: "confirm" }))}
                style={{
                  padding: "11px", borderRadius: "10px",
                  background: decision.done ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #2F6BFF, #1D4ED8)",
                  border: "none", color: decision.done ? "#3d5470" : "#ffffff",
                  fontWeight: "700", fontSize: "13px", cursor: decision.done ? "not-allowed" : "pointer",
                  transition: "all 0.18s ease",
                  boxShadow: decision.done ? "none" : "0 4px 14px rgba(47,107,255,0.35)"
                }}
                onMouseEnter={e => { if (!decision.done) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(47,107,255,0.45)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = decision.done ? "none" : "0 4px 14px rgba(47,107,255,0.35)"; }}
              >
                Confirm Result
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Decision Modal ── */}
      {decision.open && (
        <div
          onClick={() => setDecision(d => ({ ...d, open: null }))}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            backgroundColor: "rgba(4,10,22,0.88)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: "#0c1e38", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "18px", padding: "32px", maxWidth: "460px", width: "100%",
              boxShadow: "0 30px 60px -10px rgba(0,0,0,0.6)"
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", margin: "0 0 10px", letterSpacing: "-0.2px" }}>
              Confirm result for this attempt?
            </h3>
            <p style={{ fontSize: "13px", color: "#6a8ab0", lineHeight: "1.6", margin: "0 0 20px" }}>
              This finalises the result and is written to the audit log.
            </p>
            <textarea
              placeholder="Reviewer note (optional)"
              value={decision.note}
              onChange={e => setDecision(d => ({ ...d, note: e.target.value }))}
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "10px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#c5d8ef", fontSize: "13px", resize: "vertical",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: "1.5",
                marginBottom: "20px"
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDecision(d => ({ ...d, open: null }))}
                style={{
                  padding: "10px 20px", borderRadius: "10px",
                  backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#8A99AE", fontWeight: "600", fontSize: "13px", cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                disabled={decision.busy}
                onClick={submitDecision}
                style={{
                  padding: "10px 24px", borderRadius: "10px", border: "none",
                  background: "linear-gradient(135deg, #2F6BFF, #1D4ED8)",
                  color: "#ffffff", fontWeight: "700", fontSize: "13px",
                  cursor: decision.busy ? "not-allowed" : "pointer",
                  opacity: decision.busy ? 0.6 : 1,
                  boxShadow: "0 4px 14px rgba(47,107,255,0.3)"
                }}
              >
                {decision.busy ? "Saving…" : "Confirm Result"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
