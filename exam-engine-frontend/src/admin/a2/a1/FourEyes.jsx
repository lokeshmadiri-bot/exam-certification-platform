// A1 — Four-Eyes / Two-Person-Rule shared components
//
// TwoPersonRuleBanner   — warning banner on pages with dual-approval actions
// PendingApprovalBadge  — small amber pill next to items awaiting second admin
// RequestApprovalModal  — modal for initiating a four-eyes request (note + confirm)

import React, { useState } from "react";

// -------- Two-Person Rule Banner --------
// Shows: ⚠ This action requires approval from another administrator.
export function TwoPersonRuleBanner({ text }) {
    return (
        <div className="a1-four-eyes-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
                <strong>Two-person rule.</strong>{" "}
                {text || "This action requires approval from another administrator."}
            </div>
        </div>
    );
}

// -------- Pending Approval Badge --------
export function PendingApprovalBadge() {
    return <span className="a1-pending-badge">Pending</span>;
}

// -------- Request Approval Modal --------
// tone: "primary" | "amber" | "red"
export function RequestApprovalModal({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    tone = "primary",
    onCancel,
    onConfirm,
}) {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (!open) return null;

    const toneClass =
        tone === "amber"
            ? "a1-btn-amber"
            : tone === "red"
              ? "a1-btn-red"
              : "a1-btn-primary";

    const handleConfirm = async () => {
        setBusy(true);
        try {
            await onConfirm(note);
        } finally {
            setBusy(false);
            setNote("");
        }
    };

    const handleCancel = () => {
        setNote("");
        onCancel();
    };

    return (
        <div className="a1-modal-overlay" onClick={handleCancel}>
            <div className="a1-modal" onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>

                {description && <p className="a1-sub" style={{ margin: "8px 0 0" }}>{description}</p>}

                <textarea
                    className="a1-textarea"
                    placeholder="Add a note for the approving administrator (optional)…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />

                <div className="a1-modal-actions">
                    <button
                        className="a1-btn a1-btn-ghost"
                        onClick={handleCancel}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className={`a1-btn ${toneClass}`}
                        onClick={handleConfirm}
                        disabled={busy}
                    >
                        {busy ? "Submitting…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
