// A2 · Tasks 3 + 4 + 5 — Attempt review
// 3: Recording playback via signed URL, access-is-logged banner
// 4: Snapshot + violation timeline from the flags endpoint
//    (full taxonomy + 160×120 thumbnails) + admin-only score panel
// 5: Decision flow — four-eyes escalation + result-confirm action

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchAttempt, fetchRecordingUrl, fetchFlags, fetchScore,
  confirmResult, escalateForSecondReview,
} from "../services/api";
import { ResultPill } from "./AttemptsPage";
import "../components/a2.css";

const SEVERITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

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

  const submitDecision = async () => {
    setDecision((d) => ({ ...d, busy: true }));
    const payload = { note: decision.note, decidedAt: new Date().toISOString() };
    const fn = decision.open === "confirm" ? confirmResult : escalateForSecondReview;
    const res = await fn(attemptId, payload);
    setDecision({ open: null, note: "", busy: false, done: res.status });
  };

  if (!attempt) return <div className="a2-page a2-loading">Loading attempt…</div>;

  return (
    <div className="a2-page">
      <header className="a2-page-head a2-review-head">
        <div>
          <button className="a2-btn a2-btn-ghost" onClick={() => navigate("/admin/attempts")}>
            ← Attempts
          </button>
          <h1>
            Review — {attempt.exam || attempt.examTitle || "Exam Attempt"}
          </h1>
          <p className="a2-sub">
            {attempt.candidate} · {attempt.stack}{attempt.level && attempt.level !== "—" ? ` · ${attempt.level}` : ""} ·{" "}
            {new Date(attempt.submittedAt).toLocaleString()}
          </p>
        </div>
        <ResultPill result={attempt.result} />
      </header>

      {decision.done && (
        <div className={`a2-banner ${decision.done === "CONFIRMED" ? "a2-banner-green" : "a2-banner-amber"}`}>
          {decision.done === "CONFIRMED"
            ? "Result confirmed. The candidate record has been updated."
            : "Escalated. A second reviewer has been requested — the result stays pending until they decide."}
        </div>
      )}

      <div className="a2-review-grid">
        {/* ---------- LEFT: recording + timeline ---------- */}
        <div className="a2-review-main">
          {/* Task 3 — recording playback */}
          <section className="a2-card">
            <div className="a2-banner a2-banner-navy a2-banner-slim">
              🔒 This recording is served via a time-limited signed URL. Every playback access is logged.
            </div>
            {recording?.url ? (
              <video ref={videoRef} className="a2-video" src={recording.url} controls preload="metadata" />
            ) : (
              <div className="a2-video a2-video-empty">
                Recording not available yet — the signed URL endpoint returned no media.
              </div>
            )}
          </section>

          {/* Task 4 — integrity timeline */}
          <section className="a2-card">
            <h2>Integrity timeline</h2>
            {!flags ? (
              <div className="a2-loading">Loading flags…</div>
            ) : flags.items.length === 0 ? (
              <div className="a2-empty">No integrity violations were flagged for this attempt.</div>
            ) : (
              <>
                <div className="a2-taxonomy">
                  {flags.taxonomy.map((t) => {
                    const count = flags.items.filter((f) => f.type === t).length;
                    return (
                      <span key={t} className={`a2-tax-chip ${count ? "a2-tax-hit" : ""}`}>
                        {t.replace(/_/g, " ").toLowerCase()} {count ? `· ${count}` : ""}
                      </span>
                    );
                  })}
                </div>
                <ul className="a2-timeline">
                  {[...flags.items]
                    .sort((a, b) => a.tSec - b.tSec)
                    .map((f) => (
                      <li
                        key={f.id}
                        className={`a2-tl-item a2-sev-${f.severity} ${activeFlag === f.id ? "a2-tl-active" : ""}`}
                        onClick={() => seekTo(f.tSec, f.id)}
                      >
                        <div className="a2-tl-thumb">
                          {f.thumbnail ? (
                            <img src={f.thumbnail} width={160} height={120} alt={`Snapshot at ${fmtTime(f.tSec)}`} />
                          ) : (
                            <div className="a2-thumb-ph">160×120<br />snapshot</div>
                          )}
                        </div>
                        <div className="a2-tl-body">
                          <div className="a2-tl-top">
                            <span className="a2-mono">{fmtTime(f.tSec)}</span>
                            <span className={`a2-pill a2-pill-sev-${f.severity}`}>{f.severity}</span>
                          </div>
                          <div className="a2-tl-type">{f.type.replace(/_/g, " ")}</div>
                          <div className="a2-tl-note">{f.note}</div>
                          <button className="a2-btn a2-btn-ghost a2-btn-sm">Jump to moment ▸</button>
                        </div>
                      </li>
                    ))}
                </ul>
              </>
            )}
          </section>
        </div>

        {/* ---------- RIGHT: score + decision ---------- */}
        <aside className="a2-review-side">
          {/* Task 4 — admin-only score panel */}
          <section className="a2-card">
            <div className="a2-card-head">
              <h2>Score</h2>
              <span className="a2-pill a2-pill-navy">Admin only</span>
            </div>
            {!score ? (
              <div className="a2-loading">Loading…</div>
            ) : (
              <>
                <div className="a2-score-total">
                  {score.total}<span className="a2-score-max"> / {score.maxTotal}</span>
                </div>
                <ul className="a2-score-list">
                  {score.sections.map((s) => (
                    <li key={s.name}>
                      <span>{s.name}</span>
                      <span className="a2-mono">{s.score}/{s.max}</span>
                    </li>
                  ))}
                  <li>
                    <span>Result</span>
                    <ResultPill result={score.autoResult} />
                  </li>
                  {(score.level || (attempt.level && attempt.level !== "—")) && (
                    <li>
                      <span>Level</span>
                      <span className={`a2-pill a2-lvl-${score.level || attempt.level}`}>{score.level || attempt.level}</span>
                    </li>
                  )}
                </ul>
              </>
            )}
          </section>

          {/* Task 5 — decision flow */}
          <section className="a2-card">
            <h2>Decision</h2>
            <p className="a2-sub">
              Confirm the automatic result, or escalate for a second reviewer
              (four-eyes) when the flags are ambiguous.
            </p>
            <div className="a2-decision-btns">
              <button
                className="a2-btn a2-btn-primary"
                disabled={!!decision.done}
                onClick={() => setDecision((d) => ({ ...d, open: "confirm" }))}
              >
                Confirm result
              </button>
              <button
                className="a2-btn a2-btn-amber"
                disabled={!!decision.done}
                onClick={() => setDecision((d) => ({ ...d, open: "escalate" }))}
              >
                Escalate — request second reviewer
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Decision confirmation modal */}
      {decision.open && (
        <div className="a2-modal-overlay" onClick={() => setDecision((d) => ({ ...d, open: null }))}>
          <div className="a2-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {decision.open === "confirm"
                ? `Confirm ${attempt.result.replace("_", " ")} for ${attempt.candidate} (${attempt.exam || attempt.examTitle || attempt.stack})?`
                : `Escalate ${attempt.candidate}'s attempt (${attempt.exam || attempt.examTitle || attempt.stack}) to a second reviewer?`}
            </h3>
            <p className="a2-sub">
              {decision.open === "confirm"
                ? "This finalises the result and is written to the audit log."
                : "The attempt stays pending until the second reviewer decides. Both decisions are audit-logged."}
            </p>
            <textarea
              className="a2-textarea"
              placeholder={decision.open === "confirm" ? "Reviewer note (optional)" : "Reason for escalation (required)"}
              value={decision.note}
              onChange={(e) => setDecision((d) => ({ ...d, note: e.target.value }))}
            />
            <div className="a2-modal-actions">
              <button className="a2-btn a2-btn-ghost" onClick={() => setDecision((d) => ({ ...d, open: null }))}>
                Cancel
              </button>
              <button
                className={`a2-btn ${decision.open === "confirm" ? "a2-btn-primary" : "a2-btn-amber"}`}
                disabled={decision.busy || (decision.open === "escalate" && !decision.note.trim())}
                onClick={submitDecision}
              >
                {decision.busy ? "Saving…" : decision.open === "confirm" ? "Confirm result" : "Escalate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
