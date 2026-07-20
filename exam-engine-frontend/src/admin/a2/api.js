// ============================================================
// A2 Admin — API layer
// Every screen in the A2 stream talks to the backend ONLY
// through this file. If an endpoint is not live yet, the call
// automatically falls back to mock data so the UI still works.
// ============================================================

const BASE = "/api/admin";

async function get(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  ).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

function authHeaders() {
  const token = localStorage.getItem("admin_token"); // shared admin shell token (Day 1)
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// safe wrapper: real API first, mock fallback
async function withFallback(fn, mock) {
  try {
    return await fn();
  } catch (e) {
    console.warn("[A2] falling back to mock data:", e.message);
    return typeof mock === "function" ? mock() : mock;
  }
}

// ---------------- Endpoints ----------------

// 1) Dashboard analytics
export const fetchDashboard = () =>
  withFallback(() => get("/analytics/dashboard"), MOCK.dashboard);

// 2) Attempts (table + filters)
export const fetchAttempts = (filters) =>
  withFallback(() => get("/attempts", filters), () => mockAttempts(filters));

export const fetchAttempt = (id) =>
  withFallback(
    () => get(`/attempts/${id}`),
    () => MOCK.attemptList.find((a) => a.id === id) || MOCK.attemptList[0]
  );

// 3) Recording playback — signed URL (access is logged server-side)
export const fetchRecordingUrl = (attemptId) =>
  withFallback(() => get(`/attempts/${attemptId}/recording-url`), {
    url: "",
    expiresAt: null,
    accessLogged: true,
  });

// 4) Integrity flags endpoint — full taxonomy + thumbnails
export const fetchFlags = (attemptId) =>
  withFallback(() => get(`/attempts/${attemptId}/flags`), MOCK.flags);

// 4) Admin-only score panel
export const fetchScore = (attemptId) =>
  withFallback(() => get(`/attempts/${attemptId}/score`), MOCK.score);

// 5) Decision flow — four-eyes escalation + result confirm
export const confirmResult = (attemptId, payload) =>
  withFallback(() => post(`/attempts/${attemptId}/decision/confirm`, payload), {
    ok: true,
    status: "CONFIRMED",
  });

export const escalateForSecondReview = (attemptId, payload) =>
  withFallback(() => post(`/attempts/${attemptId}/decision/escalate`, payload), {
    ok: true,
    status: "ESCALATED",
  });

// 6) Notifications
export const fetchNotifications = () =>
  withFallback(() => get("/notifications"), MOCK.notifications);

export const markNotificationRead = (id) =>
  withFallback(() => post(`/notifications/${id}/read`, {}), { ok: true });

// ---------------- Mock data ----------------

const STACKS = ["Java", "React", "Python", "Node", "SQL"];
const LEVELS = ["L1", "L2", "L3", "L4", "L5"];
const RESULTS = ["PASS", "FAIL", "NEEDS_REVIEW"];

const MOCK = {
  dashboard: {
    kpis: {
      totalAttempts: 412,
      passRate: 63.4,
      needsReview: 17,
      avgDurationMin: 47,
    },
    levelDistribution: LEVELS.map((lvl, i) => ({
      level: lvl,
      count: [140, 118, 82, 48, 24][i],
    })),
    passRateSplit: [
      { name: "Pass", value: 261 },
      { name: "Fail", value: 134 },
      { name: "Needs review", value: 17 },
    ],
    attemptsByStack: STACKS.map((s, i) => ({
      stack: s,
      pass: [58, 62, 49, 41, 51][i],
      fail: [30, 24, 28, 26, 26][i],
    })),
    needsReviewQueue: [
      { id: "ATT-0391", candidate: "R. Sharma", stack: "Java", level: "L3", flaggedAt: "2026-07-03T08:40:00Z", flagCount: 4 },
      { id: "ATT-0388", candidate: "P. Reddy", stack: "React", level: "L2", flaggedAt: "2026-07-03T07:55:00Z", flagCount: 2 },
      { id: "ATT-0384", candidate: "K. Iyer", stack: "Python", level: "L4", flaggedAt: "2026-07-02T17:20:00Z", flagCount: 6 },
      { id: "ATT-0379", candidate: "S. Das", stack: "SQL", level: "L1", flaggedAt: "2026-07-02T14:05:00Z", flagCount: 1 },
      { id: "ATT-0371", candidate: "M. Khan", stack: "Node", level: "L3", flaggedAt: "2026-07-02T11:30:00Z", flagCount: 3 },
    ],
  },

  attemptList: Array.from({ length: 48 }, (_, i) => {
    const n = 400 - i;
    return {
      id: `ATT-0${n}`,
      candidate: ["A. Kumar", "R. Sharma", "P. Reddy", "K. Iyer", "S. Das", "M. Khan", "V. Rao", "N. Gupta"][i % 8],
      stack: STACKS[i % STACKS.length],
      level: LEVELS[i % LEVELS.length],
      result: RESULTS[i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0],
      score: 40 + ((i * 13) % 60),
      durationMin: 30 + ((i * 7) % 45),
      submittedAt: new Date(Date.now() - i * 5 * 3600 * 1000).toISOString(),
      flagCount: i % 7 === 0 ? 2 + (i % 5) : i % 4 === 0 ? 1 : 0,
    };
  }),

  flags: {
    taxonomy: [
      "FACE_NOT_VISIBLE", "MULTIPLE_FACES", "GAZE_AWAY", "TAB_SWITCH",
      "COPY_PASTE", "SECOND_DEVICE", "VOICE_DETECTED", "SCREEN_SHARE_LOST",
    ],
    items: [
      { id: "F-1", type: "TAB_SWITCH", severity: "MEDIUM", tSec: 312, thumbnail: null, note: "Focus lost 6.2s" },
      { id: "F-2", type: "GAZE_AWAY", severity: "LOW", tSec: 741, thumbnail: null, note: "Sustained off-screen gaze 9s" },
      { id: "F-3", type: "MULTIPLE_FACES", severity: "HIGH", tSec: 1290, thumbnail: null, note: "Second face detected 3.1s" },
      { id: "F-4", type: "COPY_PASTE", severity: "HIGH", tSec: 1815, thumbnail: null, note: "External paste, 214 chars" },
    ],
  },

  score: {
    total: 71,
    maxTotal: 100,
    autoResult: "NEEDS_REVIEW",
    sections: [
      { name: "MCQ", score: 18, max: 20 },
      { name: "Coding — Problem 1", score: 22, max: 30 },
      { name: "Coding — Problem 2", score: 19, max: 30 },
      { name: "System Design", score: 12, max: 20 },
    ],
    integrityPenaltyApplied: false,
  },

  notifications: [
    { id: "N-1", type: "REVIEW", text: "ATT-0391 flagged — 4 integrity violations, awaiting review", ts: "2026-07-03T08:41:00Z", read: false, attemptId: "ATT-0391" },
    { id: "N-2", type: "ESCALATION", text: "ATT-0384 escalated by A. Verma — second reviewer required", ts: "2026-07-02T17:25:00Z", read: false, attemptId: "ATT-0384" },
    { id: "N-3", type: "SYSTEM", text: "Recording storage at 82% capacity", ts: "2026-07-02T09:00:00Z", read: true },
  ],
};

function mockAttempts(filters = {}) {
  let rows = MOCK.attemptList;
  if (filters.stack) rows = rows.filter((r) => r.stack === filters.stack);
  if (filters.level) rows = rows.filter((r) => r.level === filters.level);
  if (filters.result) rows = rows.filter((r) => r.result === filters.result);
  if (filters.from) rows = rows.filter((r) => r.submittedAt >= filters.from);
  if (filters.to) rows = rows.filter((r) => r.submittedAt <= `${filters.to}T23:59:59Z`);
  return { rows, total: rows.length };
}

export const META = { STACKS, LEVELS, RESULTS };
