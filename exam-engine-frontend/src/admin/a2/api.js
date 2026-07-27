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
      totalAttempts: 0,
      passRate: 0.0,
      needsReview: 0,
      avgDurationMin: 0,
    },
    levelDistribution: [],
    passRateSplit: [],
    attemptsByStack: [],
    needsReviewQueue: [],
  },

  attemptList: [],

  flags: {
    taxonomy: [
      "FACE_NOT_VISIBLE", "MULTIPLE_FACES", "GAZE_AWAY", "TAB_SWITCH",
      "COPY_PASTE", "SECOND_DEVICE", "VOICE_DETECTED", "SCREEN_SHARE_LOST",
    ],
    items: [],
  },

  score: {
    total: 0,
    maxTotal: 100,
    autoResult: "NEEDS_REVIEW",
    sections: [],
    integrityPenaltyApplied: false,
  },

  notifications: [],
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
