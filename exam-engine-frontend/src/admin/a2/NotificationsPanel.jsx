import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { fetchNotifications, markNotificationRead } from "./api";
import "./a2.css";

export default function NotificationsPanel() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = () => fetchNotifications().then(setItems);

  useEffect(() => {
    load();
    const t = setInterval(load, 5_000); // 5s fast polling for immediate notifications
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

  const handleMarkAllRead = async () => {
    const unreadItems = items.filter(n => !n.read);
    await Promise.all(unreadItems.map(n => markNotificationRead(n.id)));
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        className="a2-bell"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F7FC",
          border: "1px solid #E4EAF2",
          cursor: "pointer",
          color: "#5C6B82",
          transition: "all 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#EEF2F8";
          e.currentTarget.style.color = "#0E1B2E";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#F4F7FC";
          e.currentTarget.style.color = "#5C6B82";
        }}
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && <span className="a2-bell-badge">{unread}</span>}
      </button>

      {open && (
        <>
          {/* Transparent click-catcher to close on click outside, without darkening screen */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99,
              background: "transparent"
            }}
            onClick={() => setOpen(false)}
          />

          <aside
            style={{
              position: "absolute",
              right: 0,
              top: "48px",
              width: "420px",
              maxHeight: "520px",
              background: "#fff",
              border: "1px solid #E4EAF2",
              borderRadius: "16px",
              boxShadow: "0 12px 36px rgba(11,31,56,0.12)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fade 0.2s ease"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #EEF2F8",
                backgroundColor: "#FFF"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#0E1B2E" }}>Notifications</h2>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ fontSize: "12px", color: "#2F6BFF", fontWeight: "600", cursor: "pointer" }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ fontSize: "12.5px", color: "#8A99AE", fontWeight: "600", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={{ overflowY: "auto", flex: 1, maxHeight: "440px" }}>
              {items.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#8A99AE", fontSize: "13px" }}>
                  You're all caught up.
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
                  {items.map((n) => {
                    const isUnread = !n.read;
                    let dotClass = "a2-notif-system";
                    if (n.type === "REVIEW") dotClass = "a2-notif-review";
                    if (n.type === "ESCALATION") dotClass = "a2-notif-escalation";

                    return (
                      <li
                        key={n.id}
                        className={`${isUnread ? "a2-notif-unread" : ""} ${n.attemptId ? "a2-clickable" : ""}`}
                        onClick={() => openItem(n)}
                        style={{
                          display: "flex",
                          gap: "12px",
                          padding: "14px 18px",
                          borderBottom: "1px solid #EEF2F8",
                          backgroundColor: isUnread ? "#F4F7FC" : "#FFF",
                          cursor: n.attemptId ? "pointer" : "default",
                          transition: "background-color 0.15s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isUnread ? "#EEF2F8" : "#F9FAFB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isUnread ? "#F4F7FC" : "#FFF";
                        }}
                      >
                        <span className={`a2-notif-dot ${dotClass}`} style={{ marginTop: "6px" }} />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "13.5px",
                              color: "#0E1B2E",
                              fontWeight: isUnread ? "600" : "500",
                              lineHeight: "1.4"
                            }}
                          >
                          {n.text || n.title}
                            {(n.desc || n.description) && (
                              <div style={{ fontSize: "12px", color: "#8A99AE", fontWeight: "normal", marginTop: "2px" }}>
                                {n.desc || n.description}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#8A99AE", marginTop: "4px" }}>
                            {new Date(n.ts || n.time).toLocaleString()}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
