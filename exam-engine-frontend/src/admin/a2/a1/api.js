// ============================================================
// A1 Admin — API layer
// Every screen in the A1 stream (Authoring, Catalogue & Governance)
// talks to the backend ONLY through this file. If an endpoint is
// not live yet, the call automatically falls back to an in-memory
// mock store so the UI still works end-to-end (including the
// four-eyes approval loop) with no backend running.
//
// Shares the same admin_token as A2 — set once at login here,
// read by every other A1/A2 screen.
// ============================================================

const BASE = "/api/admin";

// ---------------- low-level HTTP ----------------

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

async function put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return res.json();
}

async function del(path) {
    const res = await fetch(`${BASE}${path}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
    return res.json();
}

function authHeaders() {
    const token = localStorage.getItem("admin_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// safe wrapper: real API first, mock fallback
async function withFallback(fn, mock) {
    try {
        return await fn();
    } catch (e) {
        console.warn("[A1] falling back to mock data:", e.message);
        return typeof mock === "function" ? mock() : mock;
    }
}

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

// ---------------- Auth (Task 1 — Admin Shell) ----------------

export const login = (email, password) =>
    withFallback(
        () => post("/auth/login", { email, password }),
        () => mockLogin(email, password)
    );

export const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    return withFallback(() => post("/auth/logout", {}), { ok: true });
};

export const fetchMe = () =>
    withFallback(() => get("/auth/me"), () => {
        const raw = localStorage.getItem("admin_user");
        return raw ? JSON.parse(raw) : null;
    });

// ---------------- Exams Library (Task 2) ----------------

export const fetchExams = (filters = {}) =>
    withFallback(() => get("/exams", filters), () => mockListExams(filters));

export const fetchExam = (id) =>
    withFallback(() => get(`/exams/${id}`), () => MOCK.exams.find((e) => e.id === id));

export const createExam = (payload) =>
    withFallback(() => post("/exams", payload), () => mockCreateExam(payload));

export const updateExam = (id, payload) =>
    withFallback(() => put(`/exams/${id}`, payload), () => mockUpdateExam(id, payload));

export const duplicateExam = (id) =>
    withFallback(() => post(`/exams/${id}/duplicate`, {}), () => mockDuplicateExam(id));

export const fetchExamVersions = (id) =>
    withFallback(() => get(`/exams/${id}/versions`), () =>
        MOCK.examVersions.filter((v) => v.examId === id)
    );

export const publishExamVersion = (id, payload) =>
    withFallback(() => post(`/exams/${id}/versions/publish`, payload), () =>
        mockPublishVersion(id, payload)
    );

// ---------------- Authoring — Difficulty Band Editor (Task 3) ----------------

export const fetchBands = (examId) =>
    withFallback(() => get(`/exams/${examId}/bands`), () => mockGetBands(examId));

export const saveBands = (examId, bands) =>
    withFallback(() => put(`/exams/${examId}/bands`, bands), () => mockSaveBands(examId, bands));

// Four-eyes: activate / deactivate raise an approval request instead of
// changing state directly.
export const requestExamActivation = (id, note) =>
    withFallback(() => post(`/exams/${id}/activate`, { note }), () =>
        mockRequestExamStatus(id, "ACTIVE", note)
    );

export const requestExamDeactivation = (id, note) =>
    withFallback(() => post(`/exams/${id}/deactivate`, { note }), () =>
        mockRequestExamStatus(id, "INACTIVE", note)
    );

// ---------------- Question Bank (Task 4) ----------------

export const fetchQuestions = (filters = {}) =>
    withFallback(() => get("/questions", filters), () => mockListQuestions(filters));

export const fetchQuestion = (id) =>
    withFallback(() => get(`/questions/${id}`), () => MOCK.questions.find((q) => q.id === id));

export const createQuestion = (payload) =>
    withFallback(() => post("/questions", payload), () => mockCreateQuestion(payload));

export const updateQuestion = (id, payload) =>
    withFallback(() => put(`/questions/${id}`, payload), () => mockUpdateQuestion(id, payload));

export const deleteQuestion = (id) =>
    withFallback(() => del(`/questions/${id}`), () => mockDeleteQuestion(id));

export const bulkUpdateQuestions = (ids, patch) =>
    withFallback(() => post("/questions/bulk", { ids, patch }), () =>
        mockBulkUpdateQuestions(ids, patch)
    );

// ---------------- Candidates (Task 5) ----------------

export const fetchCandidates = (filters = {}) =>
    withFallback(() => get("/candidates", filters), () => mockListCandidates(filters));

export const requestCandidateLockOverride = (id, note) =>
    withFallback(() => post(`/candidates/${id}/lock-override/request`, { note }), () =>
        mockRequestLockOverride(id, note)
    );

// ---------------- Governance & Settings (Task 6) ----------------

export const fetchGovernanceSettings = () =>
    withFallback(() => get("/governance/settings"), () => MOCK.governance);

export const updateSecuritySettings = (payload) =>
    withFallback(() => put("/governance/security", payload), () =>
        mockUpdateSecurity(payload)
    );

export const updateAISettings = (payload) =>
    withFallback(() => put("/governance/ai-settings", payload), () =>
        mockUpdateAISettings(payload)
    );

export const updateAIParameters = (payload) =>
    withFallback(() => put("/governance/ai-parameters", payload), () =>
        mockUpdateAIParameters(payload)
    );

// Four-eyes: retention policy change
export const requestRetentionChange = (days, note) =>
    withFallback(() => post("/governance/retention/request", { days, note }), () =>
        mockRequestRetentionChange(days, note)
    );

export const fetchAuditLog = (filters = {}) =>
    withFallback(() => get("/governance/audit-log", filters), () => mockAuditLog(filters));

// ---------------- Four-eyes / approvals (shared, Task 6) ----------------

export const fetchPendingApprovals = () =>
    withFallback(() => get("/approvals/pending"), () =>
        MOCK.approvals.filter((a) => a.status === "PENDING")
    );

export const approveRequest = (id, note) =>
    withFallback(() => post(`/approvals/${id}/approve`, { note }), () =>
        mockResolveApproval(id, "APPROVED", note)
    );

export const rejectRequest = (id, note) =>
    withFallback(() => post(`/approvals/${id}/reject`, { note }), () =>
        mockResolveApproval(id, "REJECTED", note)
    );

// ============================================================
// Mock data + mock store (mutated in place so the four-eyes loop
// is demonstrable without a backend)
// ============================================================

const STACKS = ["Java", "React", "Python", "Node", "SQL"];
const LEVELS = ["L1", "L2", "L3", "L4", "L5"];
const QUESTION_TYPES = ["MCQ", "CODING", "DESCRIPTIVE"];

const currentAdmin = () => {
    const raw = localStorage.getItem("admin_user");
    return raw ? JSON.parse(raw).name : "Unknown Admin";
};

const MOCK = {
    users: [
        { email: "priya.admin@company.com", password: "admin123", name: "Priya Nair", role: "ADMIN" },
        { email: "arjun.admin@company.com", password: "admin123", name: "Arjun Verma", role: "ADMIN" },
    ],

    exams: [
        { id: "EXM-101", title: "Java Backend Developer", stack: "Java", status: "ACTIVE", version: 3, questionPoolSize: 120, questionsPerAttempt: 30, durationMin: 60, passMark: 60, updatedAt: "2026-07-10T09:00:00Z", pendingApproval: null },
        { id: "EXM-102", title: "React Frontend Engineer", stack: "React", status: "ACTIVE", version: 2, questionPoolSize: 90, questionsPerAttempt: 25, durationMin: 50, passMark: 60, updatedAt: "2026-07-08T11:20:00Z", pendingApproval: null },
        { id: "EXM-103", title: "Python Data Engineer", stack: "Python", status: "DRAFT", version: 1, questionPoolSize: 60, questionsPerAttempt: 20, durationMin: 45, passMark: 55, updatedAt: "2026-07-14T15:40:00Z", pendingApproval: null },
        { id: "EXM-104", title: "Node.js Services", stack: "Node", status: "INACTIVE", version: 4, questionPoolSize: 100, questionsPerAttempt: 25, durationMin: 55, passMark: 60, updatedAt: "2026-06-29T08:10:00Z", pendingApproval: null },
        { id: "EXM-105", title: "SQL & Data Modelling", stack: "SQL", status: "ACTIVE", version: 1, questionPoolSize: 70, questionsPerAttempt: 20, durationMin: 40, passMark: 65, updatedAt: "2026-07-01T13:00:00Z", pendingApproval: null },
    ],

    examVersions: [
        { id: "V-1", examId: "EXM-101", version: 1, publishedAt: "2026-05-01T09:00:00Z", publishedBy: "Priya Nair", notes: "Initial release" },
        { id: "V-2", examId: "EXM-101", version: 2, publishedAt: "2026-06-10T09:00:00Z", publishedBy: "Arjun Verma", notes: "Added L4 coding set" },
        { id: "V-3", examId: "EXM-101", version: 3, publishedAt: "2026-07-10T09:00:00Z", publishedBy: "Priya Nair", notes: "Refreshed MCQ pool" },
    ],

    bandsByExam: {
        "EXM-101": { L1: [0, 20], L2: [21, 40], L3: [41, 60], L4: [61, 80], L5: [81, 100] },
    },

    questions: Array.from({ length: 42 }, (_, i) => {
        const level = LEVELS[i % LEVELS.length];
        const type = QUESTION_TYPES[i % QUESTION_TYPES.length];
        return {
            id: `Q-${1000 + i}`,
            title: `${STACKS[i % STACKS.length]} question #${i + 1}`,
            stack: STACKS[i % STACKS.length],
            type,
            level,
            status: i % 9 === 0 ? "INACTIVE" : "ACTIVE",
            updatedAt: new Date(Date.now() - i * 6 * 3600 * 1000).toISOString(),
        };
    }),

    candidates: [
        { id: "CAN-01", name: "R. Sharma", email: "r.sharma@mail.com", exam: "Java Backend Developer", status: "COMPLETED", locked: true, lockedUntil: "2026-08-05T00:00:00Z", lastAttempt: "2026-07-06T10:00:00Z", pendingApproval: null },
        { id: "CAN-02", name: "P. Reddy", email: "p.reddy@mail.com", exam: "React Frontend Engineer", status: "IN_PROGRESS", locked: false, lockedUntil: null, lastAttempt: "2026-07-15T12:00:00Z", pendingApproval: null },
        { id: "CAN-03", name: "K. Iyer", email: "k.iyer@mail.com", exam: "Python Data Engineer", status: "COMPLETED", locked: true, lockedUntil: "2026-07-28T00:00:00Z", lastAttempt: "2026-06-28T09:30:00Z", pendingApproval: null },
        { id: "CAN-04", name: "S. Das", email: "s.das@mail.com", exam: "SQL & Data Modelling", status: "NOT_STARTED", locked: false, lockedUntil: null, lastAttempt: null, pendingApproval: null },
        { id: "CAN-05", name: "M. Khan", email: "m.khan@mail.com", exam: "Node.js Services", status: "COMPLETED", locked: true, lockedUntil: "2026-08-01T00:00:00Z", lastAttempt: "2026-07-02T14:15:00Z", pendingApproval: null },
    ],

    governance: {
        retentionDays: 180,
        pendingRetentionChange: null,
        security: { encryption: true, watermark: true },
        aiSettings: { flagNotFail: true, sensitivity: "MEDIUM" },
        aiParameters: {
            faceDetectionIntervalSec: 3,
            detectionConfidence: 0.2,
            gazeDeviationDeg: 35,
            absenceTriggerMisses: 5,
            alertWindowSec: 15,
            snapshotResolution: "160x120",
        },
    },

    approvals: [],
    auditLog: [
        { id: uid("AUD"), user: "Priya Nair", action: "PUBLISH_VERSION", module: "Authoring", date: "2026-07-10T09:00:00Z", oldValue: "v2", newValue: "v3" },
        { id: uid("AUD"), user: "Arjun Verma", action: "CREATE_QUESTION", module: "Question Bank", date: "2026-07-09T16:20:00Z", oldValue: "-", newValue: "Q-1032" },
    ],
};

function mockLogin(email, password) {
    const user = MOCK.users.find((u) => u.email === email && u.password === password);
    if (!user) {
        const err = new Error("Invalid credentials");
        err.mockAuthFailure = true;
        throw err;
    }
    const token = `mock.${btoa(email)}.${Date.now()}`;
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify({ name: user.name, email: user.email, role: user.role }));
    return { token, user: { name: user.name, email: user.email, role: user.role } };
}

function mockListExams(filters) {
    let rows = MOCK.exams;
    if (filters.q) rows = rows.filter((e) => e.title.toLowerCase().includes(filters.q.toLowerCase()));
    if (filters.stack) rows = rows.filter((e) => e.stack === filters.stack);
    if (filters.status) rows = rows.filter((e) => e.status === filters.status);
    return { rows, total: rows.length };
}

function mockCreateExam(payload) {
    const exam = {
        id: uid("EXM"),
        status: "DRAFT",
        version: 1,
        updatedAt: nowIso(),
        pendingApproval: null,
        ...payload,
    };
    MOCK.exams.unshift(exam);
    pushAudit("CREATE_EXAM", "Exams Library", "-", exam.id);
    return exam;
}

function mockUpdateExam(id, payload) {
    const exam = MOCK.exams.find((e) => e.id === id);
    if (!exam) throw new Error("Exam not found");
    Object.assign(exam, payload, { updatedAt: nowIso() });
    pushAudit("EDIT_EXAM_METADATA", "Exams Library", "-", id);
    return exam;
}

function mockDuplicateExam(id) {
    const src = MOCK.exams.find((e) => e.id === id);
    if (!src) throw new Error("Exam not found");
    const copy = { ...src, id: uid("EXM"), title: `${src.title} (Copy)`, status: "DRAFT", version: 1, updatedAt: nowIso(), pendingApproval: null };
    MOCK.exams.unshift(copy);
    pushAudit("DUPLICATE_EXAM", "Exams Library", id, copy.id);
    return copy;
}

function mockPublishVersion(id, payload) {
    const exam = MOCK.exams.find((e) => e.id === id);
    if (!exam) throw new Error("Exam not found");
    const nextVersion = exam.version + 1;
    MOCK.examVersions.push({
        id: uid("V"),
        examId: id,
        version: nextVersion,
        publishedAt: nowIso(),
        publishedBy: currentAdmin(),
        notes: payload?.notes || "",
    });
    exam.version = nextVersion;
    exam.updatedAt = nowIso();
    pushAudit("PUBLISH_VERSION", "Authoring", `v${nextVersion - 1}`, `v${nextVersion}`);
    return exam;
}

function mockRequestExamStatus(examId, targetStatus, note) {
    const exam = MOCK.exams.find((e) => e.id === examId);
    if (!exam) throw new Error("Exam not found");
    const approval = {
        id: uid("APR"),
        type: targetStatus === "ACTIVE" ? "EXAM_ACTIVATE" : "EXAM_DEACTIVATE",
        label: `${targetStatus === "ACTIVE" ? "Activate" : "Deactivate"} exam · ${exam.title}`,
        targetId: examId,
        requestedBy: currentAdmin(),
        requestedAt: nowIso(),
        note: note || "",
        status: "PENDING",
        payload: { targetStatus },
    };
    MOCK.approvals.unshift(approval);
    exam.pendingApproval = approval.id;
    return { ok: true, approval };
}

function mockGetBands(examId) {
    return (
        MOCK.bandsByExam[examId] || {
            L1: [0, 20], L2: [21, 40], L3: [41, 60], L4: [61, 80], L5: [81, 100],
        }
    );
}

function mockSaveBands(examId, bands) {
    MOCK.bandsByExam[examId] = bands;
    pushAudit("UPDATE_DIFFICULTY_BANDS", "Authoring", "-", examId);
    return bands;
}

function mockListQuestions(filters) {
    let rows = MOCK.questions;
    if (filters.q) rows = rows.filter((q) => q.title.toLowerCase().includes(filters.q.toLowerCase()));
    if (filters.stack) rows = rows.filter((q) => q.stack === filters.stack);
    if (filters.type) rows = rows.filter((q) => q.type === filters.type);
    if (filters.level) rows = rows.filter((q) => q.level === filters.level);
    if (filters.status) rows = rows.filter((q) => q.status === filters.status);
    return { rows, total: rows.length };
}

function mockCreateQuestion(payload) {
    const q = { id: uid("Q"), status: "ACTIVE", updatedAt: nowIso(), ...payload };
    MOCK.questions.unshift(q);
    pushAudit("CREATE_QUESTION", "Question Bank", "-", q.id);
    return q;
}

function mockUpdateQuestion(id, payload) {
    const q = MOCK.questions.find((x) => x.id === id);
    if (!q) throw new Error("Question not found");
    Object.assign(q, payload, { updatedAt: nowIso() });
    pushAudit("EDIT_QUESTION", "Question Bank", "-", id);
    return q;
}

function mockDeleteQuestion(id) {
    MOCK.questions = MOCK.questions.filter((q) => q.id !== id);
    pushAudit("DELETE_QUESTION", "Question Bank", id, "-");
    return { ok: true };
}

function mockBulkUpdateQuestions(ids, patch) {
    MOCK.questions = MOCK.questions.map((q) => (ids.includes(q.id) ? { ...q, ...patch, updatedAt: nowIso() } : q));
    pushAudit("BULK_UPDATE_QUESTIONS", "Question Bank", `${ids.length} items`, JSON.stringify(patch));
    return { ok: true, updated: ids.length };
}

function mockListCandidates(filters) {
    let rows = MOCK.candidates;
    if (filters.q) rows = rows.filter((c) => c.name.toLowerCase().includes(filters.q.toLowerCase()) || c.email.toLowerCase().includes(filters.q.toLowerCase()));
    if (filters.status) rows = rows.filter((c) => c.status === filters.status);
    if (filters.exam) rows = rows.filter((c) => c.exam === filters.exam);
    if (filters.locked) rows = rows.filter((c) => String(c.locked) === filters.locked);
    return { rows, total: rows.length };
}

function mockRequestLockOverride(id, note) {
    const candidate = MOCK.candidates.find((c) => c.id === id);
    if (!candidate) throw new Error("Candidate not found");
    const approval = {
        id: uid("APR"),
        type: "CANDIDATE_UNLOCK",
        label: `Unlock candidate · ${candidate.name}`,
        targetId: id,
        requestedBy: currentAdmin(),
        requestedAt: nowIso(),
        note: note || "",
        status: "PENDING",
        payload: {},
    };
    MOCK.approvals.unshift(approval);
    candidate.pendingApproval = approval.id;
    return { ok: true, approval };
}

function mockUpdateSecurity(payload) {
    Object.assign(MOCK.governance.security, payload);
    pushAudit("UPDATE_SECURITY", "Governance", "-", JSON.stringify(payload));
    return MOCK.governance.security;
}

function mockUpdateAISettings(payload) {
    Object.assign(MOCK.governance.aiSettings, payload);
    pushAudit("UPDATE_AI_SETTINGS", "Governance", "-", JSON.stringify(payload));
    return MOCK.governance.aiSettings;
}

function mockUpdateAIParameters(payload) {
    Object.assign(MOCK.governance.aiParameters, payload);
    pushAudit("UPDATE_AI_PARAMETERS", "Governance", "-", JSON.stringify(payload));
    return MOCK.governance.aiParameters;
}

function mockRequestRetentionChange(days, note) {
    const approval = {
        id: uid("APR"),
        type: "RETENTION_CHANGE",
        label: `Change retention policy → ${days} days`,
        targetId: "governance",
        requestedBy: currentAdmin(),
        requestedAt: nowIso(),
        note: note || "",
        status: "PENDING",
        payload: { days, oldDays: MOCK.governance.retentionDays },
    };
    MOCK.approvals.unshift(approval);
    MOCK.governance.pendingRetentionChange = approval.id;
    return { ok: true, approval };
}

function mockResolveApproval(id, status, note) {
    const approval = MOCK.approvals.find((a) => a.id === id);
    if (!approval) throw new Error("Approval not found");
    approval.status = status;
    approval.resolvedBy = currentAdmin();
    approval.resolvedAt = nowIso();
    approval.resolutionNote = note || "";

    if (status === "APPROVED") {
        if (approval.type === "EXAM_ACTIVATE" || approval.type === "EXAM_DEACTIVATE") {
            const exam = MOCK.exams.find((e) => e.id === approval.targetId);
            if (exam) {
                pushAudit(approval.type, "Exams Library", exam.status, approval.payload.targetStatus);
                exam.status = approval.payload.targetStatus;
                exam.pendingApproval = null;
            }
        }
        if (approval.type === "CANDIDATE_UNLOCK") {
            const c = MOCK.candidates.find((x) => x.id === approval.targetId);
            if (c) {
                pushAudit("CANDIDATE_UNLOCK", "Candidates", "LOCKED", "UNLOCKED");
                c.locked = false;
                c.lockedUntil = null;
                c.pendingApproval = null;
            }
        }
        if (approval.type === "RETENTION_CHANGE") {
            pushAudit("RETENTION_POLICY_CHANGE", "Governance", `${approval.payload.oldDays}d`, `${approval.payload.days}d`);
            MOCK.governance.retentionDays = approval.payload.days;
            MOCK.governance.pendingRetentionChange = null;
        }
    } else {
        // rejected — just clear the pending flag on the target
        if (approval.type.startsWith("EXAM_")) {
            const exam = MOCK.exams.find((e) => e.id === approval.targetId);
            if (exam) exam.pendingApproval = null;
        }
        if (approval.type === "CANDIDATE_UNLOCK") {
            const c = MOCK.candidates.find((x) => x.id === approval.targetId);
            if (c) c.pendingApproval = null;
        }
        if (approval.type === "RETENTION_CHANGE") {
            MOCK.governance.pendingRetentionChange = null;
        }
    }
    return approval;
}

function mockAuditLog(filters) {
    let rows = [...MOCK.auditLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filters.module) rows = rows.filter((r) => r.module === filters.module);
    if (filters.user) rows = rows.filter((r) => r.user === filters.user);
    return { rows, total: rows.length };
}

function pushAudit(action, module, oldValue, newValue) {
    MOCK.auditLog.unshift({
        id: uid("AUD"),
        user: currentAdmin(),
        action,
        module,
        date: nowIso(),
        oldValue: String(oldValue),
        newValue: String(newValue),
    });
}

export const META = { STACKS, LEVELS, QUESTION_TYPES };