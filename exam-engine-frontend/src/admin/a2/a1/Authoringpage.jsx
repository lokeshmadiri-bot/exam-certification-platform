// A1 · Task 3 — Authoring
// Exam Format Form (title, stack, duration, pass mark, pool size,
// questions per attempt, instructions) + Difficulty Band Editor (L1–L5,
// validated: starts at 0, ends at 100, no overlaps, no gaps, continuous).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchExam, createExam, updateExam, fetchBands, saveBands, META } from "./api";
import "./a1.css";

const LEVELS = META.LEVELS;

const emptyForm = {
    title: "",
    stack: META.STACKS[0],
    durationMin: 60,
    passMark: 60,
    questionPoolSize: 100,
    questionsPerAttempt: 25,
    instructions: "",
};

const defaultBands = { L1: [90, 100], L2: [75, 89], L3: [60, 74], L4: [40, 59], L5: [0, 39] };

const BAND_META = {
    L1: { label: "Expert", desc: "Mastery of the stack" },
    L2: { label: "Advanced", desc: "Strong, independent capability" },
    L3: { label: "Intermediate", desc: "Competent with some gaps" },
    L4: { label: "Beginner", desc: "Foundational knowledge" },
    L5: { label: "Needs Training", desc: "Significant upskilling required" },
};

export default function AuthoringPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const examId = params.get("examId");

    const [form, setForm] = useState(emptyForm);
    const [bands, setBands] = useState(defaultBands);
    const [loading, setLoading] = useState(!!examId);
    const [savingForm, setSavingForm] = useState(false);
    const [savingBands, setSavingBands] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");

    useEffect(() => {
        if (!examId) {
            setForm(emptyForm);
            setBands(defaultBands);
            setLoading(false);
            return;
        }
        setLoading(true);
        Promise.all([fetchExam(examId), fetchBands(examId)]).then(([exam, b]) => {
            if (exam) {
                setForm({
                    title: exam.title,
                    stack: exam.stack,
                    durationMin: exam.durationMin,
                    passMark: exam.passMark,
                    questionPoolSize: exam.questionPoolSize,
                    questionsPerAttempt: exam.questionsPerAttempt,
                    instructions: exam.instructions || "",
                });
            }
            setBands(b || defaultBands);
            setLoading(false);
        });
    }, [examId]);

    const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const minRequired = Number(form.questionsPerAttempt) || 0;
    const poolTooSmall = Number(form.questionPoolSize) < minRequired;

    const submitFormatForm = async (e) => {
        e.preventDefault();
        setSavingForm(true);
        setSavedMsg("");
        const payload = {
            ...form,
            durationMin: Number(form.durationMin),
            passMark: Number(form.passMark),
            questionPoolSize: Number(form.questionPoolSize),
            questionsPerAttempt: Number(form.questionsPerAttempt),
        };
        if (examId) {
            await updateExam(examId, payload);
            setSavedMsg("Exam format saved.");
        } else {
            const created = await createExam(payload);
            setSavedMsg("Exam created as draft. Now configure difficulty bands below.");
            setParams({ examId: created.id }, { replace: true });
        }
        setSavingForm(false);
    };

    const bandErrors = useMemo(() => validateBands(bands), [bands]);

    const setBandValue = (level, idx, value) =>
        setBands((prev) => {
            const next = { ...prev, [level]: [...prev[level]] };
            next[level][idx] = value === "" ? "" : Number(value);
            return next;
        });

    const submitBands = async () => {
        if (bandErrors.length > 0) return;
        setSavingBands(true);
        await saveBands(examId, bands);
        setSavingBands(false);
        setSavedMsg("Difficulty bands saved.");
    };

    if (loading) return <div className="a1-page a1-loading">Loading…</div>;

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Authoring</h1>
                    <p className="a1-sub">
                        {examId ? `Editing exam configuration · ${examId}` : "Configure a new exam's format, then define its difficulty bands."}
                    </p>
                </div>
                <button className="a1-btn a1-btn-ghost" onClick={() => navigate("/admin/exams")}>
                    ← Back to Exams Library
                </button>
            </header>

            {savedMsg && <div className="a1-banner a1-banner-green a1-banner-slim">{savedMsg}</div>}

            <div className="a1-grid-2">
                {/* Exam Format Form */}
                <div className="a1-card">
                    <h2>Exam Format</h2>
                    <form onSubmit={submitFormatForm}>
                        <div className="a1-form-grid">
                            <div className="a1-field">
                                <label>Exam Title</label>
                                <input
                                    required
                                    placeholder="e.g. Java Backend Developer"
                                    value={form.title}
                                    onChange={(e) => setField("title", e.target.value)}
                                />
                            </div>
                            <div className="a1-field">
                                <label>Technology Stack</label>
                                <select value={form.stack} onChange={(e) => setField("stack", e.target.value)}>
                                    {META.STACKS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="a1-field">
                                <label>Duration (minutes)</label>
                                <input type="number" min="1" required value={form.durationMin} onChange={(e) => setField("durationMin", e.target.value)} />
                            </div>
                            <div className="a1-field">
                                <label>Pass Mark (%)</label>
                                <input type="number" min="0" max="100" required value={form.passMark} onChange={(e) => setField("passMark", e.target.value)} />
                            </div>
                            <div className="a1-field">
                                <label>Question Pool Size</label>
                                <input type="number" min="1" required value={form.questionPoolSize} onChange={(e) => setField("questionPoolSize", e.target.value)} />
                            </div>
                            <div className="a1-field">
                                <label>Questions Per Attempt</label>
                                <input type="number" min="1" required value={form.questionsPerAttempt} onChange={(e) => setField("questionsPerAttempt", e.target.value)} />
                            </div>
                        </div>
                        <div className="a1-field" style={{ marginTop: 14 }}>
                            <label>Instructions</label>
                            <textarea
                                className="a1-textarea"
                                style={{ marginTop: 0 }}
                                placeholder="Shown to the candidate before the exam starts…"
                                value={form.instructions}
                                onChange={(e) => setField("instructions", e.target.value)}
                            />
                        </div>

                        <div className={`a1-pool-note ${poolTooSmall ? "a1-pool-warn" : ""}`}>
                            Question Pool = {form.questionPoolSize || 0} · Per Attempt = {form.questionsPerAttempt || 0} · Minimum
                            Required Questions = {minRequired}
                            {poolTooSmall && " — pool is smaller than questions per attempt."}
                        </div>

                        <div className="a1-modal-actions" style={{ marginTop: 16, justifyContent: "flex-start" }}>
                            <button className="a1-btn a1-btn-primary" disabled={savingForm}>
                                {savingForm ? "Saving…" : examId ? "Save exam format" : "Create exam"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Difficulty Band Editor */}
                <div className="a1-card">
                    <h2>Difficulty Band Editor</h2>
                    {!examId ? (
                        <p className="a1-sub">Create the exam first — difficulty bands are configured per exam.</p>
                    ) : (
                        <>
                            <p className="a1-sub">Ranges must cover 0–100% continuously with no gaps or overlaps.</p>
                            <table className="a1-band-table">
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        <th>Label & Interpretation</th>
                                        <th>Min %</th>
                                        <th>Max %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEVELS.map((lvl) => {
                                        const meta = BAND_META[lvl] || { label: lvl, desc: "" };
                                        const rowHasError = bandErrors.some((e) => e.startsWith(lvl));
                                        return (
                                            <tr key={lvl} className={rowHasError ? "a1-band-row-error" : ""}>
                                                <td><span className={`a1-pill a1-lvl-${lvl}`}>{lvl}</span></td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--a1-navy)" }}>{meta.label}</div>
                                                    <div style={{ fontSize: 11, color: "var(--a1-mut)" }}>{meta.desc}</div>
                                                </td>
                                                <td>
                                                    <input
                                                        className="a1-band-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={bands[lvl]?.[0] ?? ""}
                                                        onChange={(e) => setBandValue(lvl, 0, e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="a1-band-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={bands[lvl]?.[1] ?? ""}
                                                        onChange={(e) => setBandValue(lvl, 1, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {bandErrors.length > 0 ? (
                                <ul className="a1-band-errors">
                                    {bandErrors.map((e, i) => <li key={i}>⚠ {e}</li>)}
                                </ul>
                            ) : (
                                <div className="a1-band-ok">✓ Bands are continuous, 0–100%, with no gaps or overlaps.</div>
                            )}

                            <div className="a1-modal-actions" style={{ justifyContent: "flex-start" }}>
                                <button className="a1-btn a1-btn-primary" disabled={savingBands || bandErrors.length > 0} onClick={submitBands}>
                                    {savingBands ? "Saving…" : "Save difficulty bands"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Must cover 0 to 100, no overlaps, no gaps, continuous ranges only.
function validateBands(bands) {
    const errors = [];
    const sortedLevels = [...LEVELS].sort((a, b) => (bands[a]?.[0] ?? 0) - (bands[b]?.[0] ?? 0));
    let prevEnd = null;

    sortedLevels.forEach((lvl, idx) => {
        const range = bands[lvl];
        const start = range?.[0];
        const end = range?.[1];

        if (start === "" || end === "" || start == null || end == null) {
            errors.push(`${lvl}: enter both a start and an end value`);
            return;
        }
        if (Number(start) > Number(end)) {
            errors.push(`${lvl}: min score must not be greater than max score`);
            return;
        }
        if (idx === 0 && Number(start) !== 0) {
            errors.push(`${lvl}: lowest band range must start at 0%`);
        }
        if (idx === sortedLevels.length - 1 && Number(end) !== 100) {
            errors.push(`${lvl}: highest band range must end at 100%`);
        }
        if (prevEnd !== null) {
            if (Number(start) <= prevEnd) {
                errors.push(`${lvl}: overlaps with the previous band range`);
            } else if (Number(start) > prevEnd + 1) {
                errors.push(`${lvl}: leaves a gap after the previous band range`);
            }
        }
        prevEnd = Number(end);
    });

    return errors;
}