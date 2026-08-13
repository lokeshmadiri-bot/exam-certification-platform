// A2 · Task 6 — Command palette
// Cross-screen Ctrl/Cmd-K palette: navigate, filter, jump to an attempt

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { META } from "./api";
import "./a2.css";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // global shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setCursor(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const commands = useMemo(() => {
    const base = [
      { label: "Go to dashboard", hint: "Navigation", run: () => navigate("/admin/dashboard") },
      { label: "Go to attempts", hint: "Navigation", run: () => navigate("/admin/attempts") },
      { label: "Show needs-review queue", hint: "Filter", run: () => navigate("/admin/attempts?result=NEEDS_REVIEW") },
      { label: "Show failed attempts", hint: "Filter", run: () => navigate("/admin/attempts?result=FAIL") },
      ...META.STACKS.map((s) => ({
        label: `Filter attempts: ${s}`,
        hint: "Filter",
        run: () => navigate(`/admin/attempts?stack=${s}`),
      })),
      ...META.LEVELS.map((l) => ({
        label: `Filter attempts: level ${l}`,
        hint: "Filter",
        run: () => navigate(`/admin/attempts?level=${l}`),
      })),
    ];

    // free-form: open a specific attempt by id
    const idMatch = query.trim().match(/^att[-\s]?(\d+)$/i);
    if (idMatch) {
      const id = `ATT-${idMatch[1].padStart(4, "0")}`;
      base.unshift({
        label: `Open review for ${id}`,
        hint: "Attempt",
        run: () => navigate(`/admin/attempts/${id}/review`),
      });
    }
    return base;
  }, [query, navigate]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const runAt = (i) => {
    filtered[i]?.run();
    setOpen(false);
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); runAt(cursor); }
  };

  if (!open) return null;

  return (
    <div className="a2-modal-overlay a2-palette-overlay" onClick={() => setOpen(false)}>
      <div className="a2-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="a2-palette-input"
          placeholder="Type a command, filter, or attempt ID (e.g. ATT-391)…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={onInputKey}
        />
        <ul className="a2-palette-list">
          {filtered.length === 0 && <li className="a2-palette-empty">No matching command.</li>}
          {filtered.slice(0, 10).map((c, i) => (
            <li
              key={c.label}
              className={`a2-palette-item ${i === cursor ? "a2-palette-active" : ""}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => runAt(i)}
            >
              <span>{c.label}</span>
              <span className="a2-palette-hint">{c.hint}</span>
            </li>
          ))}
        </ul>
        <div className="a2-palette-foot">↑↓ navigate · Enter run · Esc close</div>
      </div>
    </div>
  );
}
