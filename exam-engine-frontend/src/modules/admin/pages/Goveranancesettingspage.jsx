// A1 · Task 6 — Governance & Settings
// Retention policy (four-eyes) · security (encryption/watermark) ·
// AI settings (flag-not-fail + sensitivity) · AI parameters ·
// audit log · pending approvals (two-person rule).

import React, { useEffect, useState } from "react";
import {
    fetchGovernanceSettings, updateSecuritySettings, updateAISettings, updateAIParameters,
    requestRetentionChange, fetchAuditLog, fetchPendingApprovals, approveRequest, rejectRequest,
} from "../services/api";
import { TwoPersonRuleBanner, RequestApprovalModal } from "../components/FourEyes";
import "../components/a1.css";

const RETENTION_OPTIONS = [90, 180, 365];
const TABS = ["Retention", "Security", "AI Settings", "AI Parameters", "Audit Log", "Approvals"];


// Backend field names used in updateAIParameters / updateAISettings API calls.
const SENSITIVITY_PRESETS = {
    LOW: {
        faceDetectionIntervalSec: 5,
        detectionConfidence: 0.30,
        gazeDeviationDeg: 45,
        absenceTriggerMisses: 8,
        alertWindowSec: 20,
        snapshotResolution: "160x120",
    },
    MEDIUM: {
        faceDetectionIntervalSec: 3,
        detectionConfidence: 0.20,
        gazeDeviationDeg: 35,
        absenceTriggerMisses: 5,
        alertWindowSec: 15,
        snapshotResolution: "160x120",
    },
    HIGH: {
        faceDetectionIntervalSec: 2,
        detectionConfidence: 0.15,
        gazeDeviationDeg: 25,
        absenceTriggerMisses: 3,
        alertWindowSec: 10,
        snapshotResolution: "320x240",
    },
};

export default function GovernanceSettingsPage() {
    const [tab, setTab] = useState("Retention");
    const [gov, setGov] = useState(null);
    const [audit, setAudit] = useState(null);
    const [approvals, setApprovals] = useState(null);
    const [savedMsg, setSavedMsg] = useState("");

    const loadGov = () => fetchGovernanceSettings().then(setGov);
    const loadAudit = () => fetchAuditLog().then((res) => setAudit(res?.rows || (Array.isArray(res) ? res : [])));
    const loadApprovals = () => fetchPendingApprovals().then((res) => setApprovals(Array.isArray(res) ? res : (res?.rows || [])));

    useEffect(() => { loadGov(); loadApprovals(); }, []);
    useEffect(() => { if (tab === "Audit Log") loadAudit(); }, [tab]);
    useEffect(() => { if (tab === "Approvals") loadApprovals(); }, [tab]);

    const flash = (msg) => { setSavedMsg(msg); loadApprovals(); setTimeout(() => setSavedMsg(""), 2500); };

    return (
        <div className="a1-page">
            <header className="a1-page-head">
                <div>
                    <h1>Governance &amp; Settings</h1>
                    <p className="a1-sub">Retention, security, proctoring AI configuration, audit trail, and dual-approval requests.</p>
                </div>
            </header>

            {savedMsg && <div className="a1-banner a1-banner-green a1-banner-slim">{savedMsg}</div>}

            <div className="a1-tabs">
                {TABS.map((t) => (
                    <div key={t} className={`a1-tab ${tab === t ? "a1-tab-active" : ""}`} onClick={() => setTab(t)}>
                        {t}{t === "Approvals" && approvals?.length ? ` (${approvals.length})` : ""}
                    </div>
                ))}
            </div>

            {!gov ? (
                <div className="a1-loading">Loading governance settings…</div>
            ) : (
                <>
                    {tab === "Retention" && <RetentionTab gov={gov} onSaved={() => { loadGov(); flash("Retention change requested — awaiting a second admin."); }} />}
                    {tab === "Security" && <SecurityTab gov={gov} onSaved={(s) => { setGov((g) => ({ ...g, security: s })); flash("Security settings saved."); }} />}
                    {tab === "AI Settings" && (
                        <AISettingsTab
                            gov={gov}
                            onSaved={(aiSettings, aiParameters) => {
                                // Lift both aiSettings and (optionally) aiParameters into shared gov state
                                setGov((g) => ({
                                    ...g,
                                    aiSettings,
                                    ...(aiParameters ? { aiParameters } : {}),
                                }));
                                flash(aiParameters
                                    ? `AI sensitivity set to ${aiSettings.sensitivity} — parameters auto-updated.`
                                    : "AI settings saved."
                                );
                            }}
                        />
                    )}
                    {tab === "AI Parameters" && (
                        <AIParametersTab
                            gov={gov}
                            onSaved={(p) => { setGov((g) => ({ ...g, aiParameters: p })); flash("AI parameters saved."); }}
                        />
                    )}
                </>
            )}

            {tab === "Audit Log" && <AuditLogTab rows={audit} onFilter={(filters) => fetchAuditLog(filters).then((res) => setAudit(res.rows))} />}
            {tab === "Approvals" && (
                <ApprovalsTab
                    rows={approvals}
                    onResolve={async (id, decision, note) => {
                        decision === "approve" ? await approveRequest(id, note) : await rejectRequest(id, note);
                        loadApprovals();
                        loadGov();
                    }}
                />
            )}
        </div>
    );
}

// ---------------- Retention ----------------

function RetentionTab({ gov, onSaved }) {
    const [days, setDays] = useState(gov.retentionDays);
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <div className="a1-card">

            <h2>Retention Policy</h2>
            <p className="a1-sub">Keep exam results for:</p>
            <div className="a1-form-grid" style={{ maxWidth: 420 }}>
                {RETENTION_OPTIONS.map((d) => (
                    <label key={d} className="a1-toggle-row" style={{ cursor: "pointer" }}>
                        <span className="a1-toggle-label">{d} Days</span>
                        <input type="radio" name="retention" checked={days === d} onChange={() => setDays(d)} />
                    </label>
                ))}
            </div>

            {gov.pendingRetentionChange && (
                <div className="a1-banner a1-banner-amber a1-banner-slim" style={{ marginTop: 12 }}>
                    A retention change is already pending a second administrator's approval.
                </div>
            )}

            <div className="a1-modal-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
                <button
                    className="a1-btn a1-btn-primary"
                    disabled={days === gov.retentionDays || !!gov.pendingRetentionChange}
                    onClick={() => setConfirmOpen(true)}
                >
                    Request retention change
                </button>
            </div>

            <RequestApprovalModal
                open={confirmOpen}
                title={`Change retention to ${days} days?`}
                description={`Current policy: ${gov.retentionDays} days. This will take effect once a second administrator approves.`}
                confirmLabel="Request change"
                tone="primary"
                onCancel={() => setConfirmOpen(false)}
                onConfirm={async (note) => {
                    await requestRetentionChange(days, note);
                    setConfirmOpen(false);
                    onSaved();
                }}
            />
        </div>
    );
}

// ---------------- Security ----------------

function SecurityTab({ gov, onSaved }) {
    const [security, setSecurity] = useState(gov.security);
    const [busy, setBusy] = useState(false);

    const toggle = async (key) => {
        const next = { ...security, [key]: !security[key] };
        setSecurity(next);
        setBusy(true);
        const saved = await updateSecuritySettings({ [key]: next[key] });
        setBusy(false);
        onSaved(saved);
    };

    return (
        <div className="a1-card">
            <h2>Security</h2>
            <Toggle
                label="Encryption"
                desc="Encrypt stored exam results and proctoring snapshots at rest."
                on={security.encryption}
                disabled={busy}
                onChange={() => toggle("encryption")}
            />
            <Toggle
                label="Watermark"
                desc="Overlay a candidate-identifying watermark on exam content."
                on={security.watermark}
                disabled={busy}
                onChange={() => toggle("watermark")}
            />
        </div>
    );
}

// ---------------- AI Settings ----------------

function AISettingsTab({ gov, onSaved }) {
    const [settings, setSettings] = useState(gov.aiSettings);
    const [busy, setBusy] = useState(false);

    const toggleFlagNotFail = async () => {
        const next = { ...settings, flagNotFail: !settings.flagNotFail };
        setSettings(next);
        setBusy(true);
        const saved = await updateAISettings({ flagNotFail: next.flagNotFail });
        setBusy(false);
        // No preset change — only pass aiSettings update
        onSaved(saved, null);
    };

    const handleSensitivityChange = async (sensitivity) => {
        const preset = SENSITIVITY_PRESETS[sensitivity];
        setSettings((s) => ({ ...s, sensitivity }));
        setBusy(true);
        try {
            // 1. Persist the new sensitivity
            const savedSettings = await updateAISettings({ sensitivity });
            // 2. Immediately persist the matching preset AI parameters
            const savedParams = await updateAIParameters(preset);
            // Lift both updates into parent gov state together
            onSaved(savedSettings, savedParams);
        } finally {
            setBusy(false);
        }
    };

    const SENSITIVITY_META = {
        LOW: { label: "Low", desc: "More tolerant — fewer false positives.", color: "#2e7d32" },
        MEDIUM: { label: "Medium", desc: "Defaults — balanced detection.", color: "#e65100" },
        HIGH: { label: "High", desc: "More strict — faster detection and alerts.", color: "#c62828" },
    };

    return (
        <div className="a1-card">
            <h2>AI Settings</h2>
            <Toggle
                label="Flag Not Fail"
                desc="Proctoring anomalies flag the attempt for review instead of auto-failing it."
                on={settings.flagNotFail}
                disabled={busy}
                onChange={toggleFlagNotFail}
            />
            <div className="a1-field" style={{ marginTop: 14, maxWidth: 260 }}>
                <label>Sensitivity</label>
                <select value={settings.sensitivity} disabled={busy} onChange={(e) => handleSensitivityChange(e.target.value)}>
                    <option value="LOW">Low — tolerant</option>
                    <option value="MEDIUM">Medium — default</option>
                    <option value="HIGH">High — strict</option>
                </select>
            </div>
            {settings.sensitivity && (
                <div className="a1-banner a1-banner-slim" style={{
                    marginTop: 12,
                    background: `${SENSITIVITY_META[settings.sensitivity]?.color}18`,
                    borderLeft: `3px solid ${SENSITIVITY_META[settings.sensitivity]?.color}`,
                    color: SENSITIVITY_META[settings.sensitivity]?.color,
                }}>
                    <strong>{SENSITIVITY_META[settings.sensitivity]?.label}:</strong>{" "}
                    {SENSITIVITY_META[settings.sensitivity]?.desc}{" "}
                    AI Parameters will be auto-updated to match.
                </div>
            )}
            {busy && <div className="a1-sub" style={{ marginTop: 8 }}>Applying preset and saving parameters…</div>}
        </div>
    );
}

// ---------------- AI Parameters ----------------

const AI_PARAM_FIELDS = [
    { key: "faceDetectionIntervalSec", label: "Face Detection Interval", unit: "sec" },
    { key: "detectionConfidence", label: "Detection Confidence", unit: "" },
    { key: "gazeDeviationDeg", label: "Gaze Deviation", unit: "°" },
    { key: "absenceTriggerMisses", label: "Absence Trigger", unit: "misses" },
    { key: "alertWindowSec", label: "Alert Window", unit: "sec" },
    { key: "snapshotResolution", label: "Snapshot Resolution", unit: "" },
];

// Shows what sensitivity level the current parameter values match (if any)
function detectPresetMatch(params) {
    for (const [level, preset] of Object.entries(SENSITIVITY_PRESETS)) {
        const matches = Object.entries(preset).every(([k, v]) =>
            String(params[k]) === String(v)
        );
        if (matches) return level;
    }
    return null; // custom values
}

function AIParametersTab({ gov, onSaved }) {
    // Re-initialize from gov whenever the parent updates (e.g. after sensitivity auto-preset)
    const [params, setParams] = useState(gov.aiParameters);
    const [busy, setBusy] = useState(false);

    // Sync with parent gov.aiParameters when it changes (e.g. after AISettingsTab applies a preset)
    React.useEffect(() => {
        setParams(gov.aiParameters);
    }, [gov.aiParameters]);

    const setField = (key, value) => setParams((p) => ({ ...p, [key]: value }));

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        // Save AI parameters
        const savedParams = await updateAIParameters(params);
        // Also persist current sensitivity so it stays in sync
        const currentSensitivity = gov.aiSettings?.sensitivity;
        if (currentSensitivity) {
            await updateAISettings({ sensitivity: currentSensitivity });
        }
        setBusy(false);
        onSaved(savedParams);
    };

    const presetMatch = detectPresetMatch(params);
    const PRESET_COLORS = { LOW: "#2e7d32", MEDIUM: "#e65100", HIGH: "#c62828" };

    return (
        <div className="a1-card">
            <h2>AI Parameters</h2>
            <p className="a1-sub">Proctoring detection thresholds. Automatically set by Sensitivity — editable manually.</p>

            {/* Preset source badge */}
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <span className="a1-sub">Preset source:</span>
                {presetMatch ? (
                    <span style={{
                        padding: "2px 10px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: `${PRESET_COLORS[presetMatch]}18`,
                        color: PRESET_COLORS[presetMatch],
                        border: `1px solid ${PRESET_COLORS[presetMatch]}40`,
                    }}>
                        {presetMatch.charAt(0) + presetMatch.slice(1).toLowerCase()} sensitivity
                    </span>
                ) : (
                    <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: "#f0f0f0", color: "#555" }}>
                        Custom
                    </span>
                )}
            </div>

            {/* Quick preset buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {Object.keys(SENSITIVITY_PRESETS).map((level) => (
                    <button
                        key={level}
                        type="button"
                        className={`a1-btn a1-btn-sm ${presetMatch === level ? "a1-btn-primary" : "a1-btn-ghost"}`}
                        onClick={() => setParams(SENSITIVITY_PRESETS[level])}
                    >
                        {level.charAt(0) + level.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            <form onSubmit={save}>
                <table className="a1-band-table">
                    <thead><tr><th>Parameter</th><th>Value</th></tr></thead>
                    <tbody>
                        {AI_PARAM_FIELDS.map((f) => (
                            <tr key={f.key}>
                                <td>{f.label}</td>
                                <td>
                                    <input
                                        className="a1-band-input"
                                        style={{ width: 120 }}
                                        value={params[f.key] ?? ""}
                                        onChange={(e) => setField(
                                            f.key,
                                            f.key === "snapshotResolution" ? e.target.value : Number(e.target.value)
                                        )}
                                    />
                                    {f.unit && <span className="a1-sub" style={{ marginLeft: 6 }}>{f.unit}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="a1-modal-actions" style={{ justifyContent: "flex-start", marginTop: 14 }}>
                    <button className="a1-btn a1-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save parameters"}</button>
                </div>
            </form>
        </div>
    );
}

// ---------------- Audit Log ----------------

function AuditLogTab({ rows, onFilter }) {
    const [module, setModule] = useState("");
    const [user, setUser] = useState("");

    const apply = (next) => {
        const filters = { module, user, ...next };
        setModule(filters.module);
        setUser(filters.user);
        onFilter(filters);
    };

    return (
        <div className="a1-card">
            <h2>Audit Log</h2>
            <div className="a1-filterbar" style={{ marginTop: 0 }}>
                <div className="a1-field">
                    <label>Module</label>
                    <select value={module} onChange={(e) => apply({ module: e.target.value })}>
                        <option value="">All modules</option>
                        <option value="Exams Library">Exams Library</option>
                        <option value="Authoring">Authoring</option>
                        <option value="Question Bank">Question Bank</option>
                        <option value="Candidates">Candidates</option>
                        <option value="Governance">Governance</option>
                    </select>
                </div>
                <div className="a1-field">
                    <label>User</label>
                    <input placeholder="Filter by admin name" value={user} onChange={(e) => apply({ user: e.target.value })} />
                </div>
            </div>

            {!rows ? (
                <div className="a1-loading">Loading audit log…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No audit entries match your filters.</div>
            ) : (
                <table className="a1-table a1-table-hover">
                    <thead>
                        <tr><th>User</th><th>Action</th><th>Module</th><th>Date</th><th>Old Value</th><th>New Value</th></tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.user}</td>
                                <td className="a1-mono">{r.action}</td>
                                <td>{r.module}</td>
                                <td>{new Date(r.date).toLocaleString()}</td>
                                <td className="a1-mono">{r.oldValue}</td>
                                <td className="a1-mono">{r.newValue}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// ---------------- Approvals ----------------

function ApprovalsTab({ rows, onResolve }) {
    const [acting, setActing] = useState(null); // { approval, decision }

    return (
        <div className="a1-card">
            <h2>Pending Approvals</h2>

            {!rows ? (
                <div className="a1-loading">Loading approvals…</div>
            ) : rows.length === 0 ? (
                <div className="a1-empty">No approvals pending.</div>
            ) : (
                rows.map((a) => (
                    <div key={a.id} className="a1-approval-item">
                        <div>
                            <div>{a.label}</div>
                            <div className="a1-approval-meta">
                                Requested by {a.requestedBy} · {new Date(a.requestedAt).toLocaleString()}
                                {a.note && <> · “{a.note}”</>}
                            </div>
                        </div>
                        <div className="a1-approval-actions">
                            <button className="a1-btn a1-btn-red a1-btn-sm" onClick={() => setActing({ approval: a, decision: "reject" })}>Reject</button>
                            <button className="a1-btn a1-btn-primary a1-btn-sm" onClick={() => setActing({ approval: a, decision: "approve" })}>Approve</button>
                        </div>
                    </div>
                ))
            )}

            <RequestApprovalModal
                open={!!acting}
                title={acting ? `${acting.decision === "approve" ? "Approve" : "Reject"} — ${acting.approval.label}` : ""}
                description="Add an optional note explaining your decision."
                confirmLabel={acting?.decision === "approve" ? "Approve" : "Reject"}
                tone={acting?.decision === "approve" ? "primary" : "red"}
                onCancel={() => setActing(null)}
                onConfirm={async (note) => {
                    await onResolve(acting.approval.id, acting.decision, note);
                    setActing(null);
                }}
            />
        </div>
    );
}

// ---------------- Shared toggle ----------------

function Toggle({ label, desc, on, disabled, onChange }) {
    return (
        <div className="a1-toggle-row">
            <div>
                <div className="a1-toggle-label">{label}</div>
                {desc && <div className="a1-toggle-desc">{desc}</div>}
            </div>
            <div
                className={`a1-switch ${on ? "a1-on" : ""}`}
                style={disabled ? { opacity: 0.6, pointerEvents: "none" } : undefined}
                onClick={onChange}
            >
                <div className="a1-switch-knob" />
            </div>
        </div>
    );
}