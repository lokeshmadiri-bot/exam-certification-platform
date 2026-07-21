// A1 · Task 6 — Governance & Settings
// Retention policy (four-eyes) · security (encryption/watermark) ·
// AI settings (flag-not-fail + sensitivity) · AI parameters ·
// audit log · pending approvals (two-person rule).

import React, { useEffect, useState } from "react";
import {
    fetchGovernanceSettings, updateSecuritySettings, updateAISettings, updateAIParameters,
    requestRetentionChange, fetchAuditLog, fetchPendingApprovals, approveRequest, rejectRequest,
} from "./api";
import { TwoPersonRuleBanner, RequestApprovalModal } from "./FourEyes";
import "./a1.css";

const RETENTION_OPTIONS = [90, 180, 365];
const TABS = ["Retention", "Security", "AI Settings", "AI Parameters", "Audit Log", "Approvals"];

export default function GovernanceSettingsPage() {
    const [tab, setTab] = useState("Retention");
    const [gov, setGov] = useState(null);
    const [audit, setAudit] = useState(null);
    const [approvals, setApprovals] = useState(null);
    const [savedMsg, setSavedMsg] = useState("");

    const loadGov = () => fetchGovernanceSettings().then(setGov);
    const loadAudit = () => fetchAuditLog().then((res) => setAudit(res.rows));
    const loadApprovals = () => fetchPendingApprovals().then(setApprovals);

    useEffect(() => { loadGov(); }, []);
    useEffect(() => { if (tab === "Audit Log") loadAudit(); }, [tab]);
    useEffect(() => { if (tab === "Approvals") loadApprovals(); }, [tab]);

    const flash = (msg) => { setSavedMsg(msg); setTimeout(() => setSavedMsg(""), 2500); };

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
                    {tab === "AI Settings" && <AISettingsTab gov={gov} onSaved={(s) => { setGov((g) => ({ ...g, aiSettings: s })); flash("AI settings saved."); }} />}
                    {tab === "AI Parameters" && <AIParametersTab gov={gov} onSaved={(p) => { setGov((g) => ({ ...g, aiParameters: p })); flash("AI parameters saved."); }} />}
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
            <TwoPersonRuleBanner text="Changing the retention policy requires approval from a second administrator." />
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
        onSaved(saved);
    };

    const setSensitivity = async (sensitivity) => {
        setSettings((s) => ({ ...s, sensitivity }));
        setBusy(true);
        const saved = await updateAISettings({ sensitivity });
        setBusy(false);
        onSaved(saved);
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
            <div className="a1-field" style={{ marginTop: 14, maxWidth: 220 }}>
                <label>Sensitivity</label>
                <select value={settings.sensitivity} disabled={busy} onChange={(e) => setSensitivity(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                </select>
            </div>
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

function AIParametersTab({ gov, onSaved }) {
    const [params, setParams] = useState(gov.aiParameters);
    const [busy, setBusy] = useState(false);

    const setField = (key, value) => setParams((p) => ({ ...p, [key]: value }));

    const save = async (e) => {
        e.preventDefault();
        setBusy(true);
        const saved = await updateAIParameters(params);
        setBusy(false);
        onSaved(saved);
    };

    return (
        <div className="a1-card">
            <h2>AI Parameters</h2>
            <p className="a1-sub">Proctoring detection thresholds, exactly as defined in the BRD.</p>
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
                                        value={params[f.key]}
                                        onChange={(e) => setField(f.key, f.key === "snapshotResolution" ? e.target.value : Number(e.target.value))}
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
            <TwoPersonRuleBanner text="These requests were raised by another administrator and need a second admin's decision." />

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