// A2 · Task 6 — Notifications panel
// Bell button + slide-over list; unread badge; deep-links into review

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markNotificationRead } from "./api";
import "./a2.css";

export default function NotificationsPanel() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = () => fetchNotifications().then(setItems);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // light polling; swap for SSE later
    return () => clearInterval(t);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const openItem = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.attemptId) {
      setOpen(false);
      navigate(`/admin/attempts/${n.attemptId}/review`);
    }
  };

  return (
    <>
      <button className="a2-bell" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        🔔{unread > 0 && <span className="a2-bell-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="a2-drawer-overlay" onClick={() => setOpen(false)} />
          <aside className="a2-drawer">
            <div className="a2-drawer-head">
              <h2>Notifications</h2>
              <button className="a2-btn a2-btn-ghost" onClick={() => setOpen(false)}>✕</button>
            </div>
            {items.length === 0 ? (
              <div className="a2-empty">You're all caught up.</div>
            ) : (
              <ul className="a2-notif-list">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`a2-notif ${n.read ? "" : "a2-notif-unread"} ${n.attemptId ? "a2-clickable" : ""}`}
                    onClick={() => openItem(n)}
                  >
                    <span className={`a2-notif-dot a2-notif-${n.type.toLowerCase()}`} />
                    <div>
                      <div className="a2-notif-text">{n.text}</div>
                      <div className="a2-notif-ts">{new Date(n.ts).toLocaleString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </>
      )}
    </>
  );
}
