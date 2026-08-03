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

const API_HOST = import.meta.env.VITE_API_HOST || "http://localhost:8080";
const BASE = `${API_HOST}/api/admin`;
// Auth endpoints live at /api/auth (not under /api/admin)
const AUTH_BASE = `${API_HOST}/api/auth`;

// ---------------- low-level HTTP ----------------

/**
 * Unwrap the backend ApiResponse envelope.
 * The backend always returns: { success, message, data, timestamp }
 * We want callers to receive `data` directly.
 */
function unwrap(json) {
    // If the response has the ApiResponse shape, return .data
    if (json !== null && typeof json === "object" && "success" in json && "data" in json) {
        return json.data;
    }
    // Otherwise return as-is (forward-compat for endpoints that return raw data)
    return json;
}

async function get(path, params = {}) {
    const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return unwrap(await res.json());
}

async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return unwrap(await res.json());
}

async function put(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return unwrap(await res.json());
}

async function del(path) {
    const res = await fetch(`${BASE}${path}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
    return unwrap(await res.json());
}

/** Direct auth helper (bypasses BASE prefix — auth lives at /api/auth) */
async function authPost(path, body) {
    const res = await fetch(`${AUTH_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${AUTH_BASE}${path} → ${res.status}`);
    return unwrap(await res.json());
}

async function authGet(path) {
    const res = await fetch(`${AUTH_BASE}${path}`, {
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`GET ${AUTH_BASE}${path} → ${res.status}`);
    return unwrap(await res.json());
}

function authHeaders() {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
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
// Auth calls go to /api/auth (not /api/admin/auth) to match the backend AuthController.

export const login = (username, password) =>
    withFallback(
        async () => {
            // Backend AuthController expects { username, password }
            const data = await authPost("/login", { username, password });
            // data = { token, username, role, fullName, userId, title }
            if (data && data.token) {
                localStorage.setItem("admin_token", data.token);
                const user = {
                    name: data.fullName || data.username,
                    email: data.username,
                    role: data.role,
                    userId: data.userId,
                };
                localStorage.setItem("admin_user", JSON.stringify(user));
            }
            return data;
        },
        () => mockLogin(username, password)
    );

export const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    // Stateless JWT — no server-side session to invalidate, just clear localStorage
    return Promise.resolve({ ok: true });
};

export const fetchMe = () =>
    withFallback(
        () => authGet("/me"),
        () => {
            const raw = localStorage.getItem("admin_user");
            return raw ? JSON.parse(raw) : null;
        }
    );

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

export const deleteExam = (id) =>
    withFallback(() => del(`/exams/${id}`), () => mockDeleteExam(id));

export const archiveExam = (id) =>
    withFallback(() => post(`/exams/${id}/archive`, {}), () => mockArchiveExam(id));

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

// ---------------- AI Question Generation (Gemini) ----------------

export const generateAIQuestions = (payload) =>
    withFallback(
        () => post("/questions/ai/generate", payload),
        () => mockGenerateAIQuestions(payload)
    );

export const saveAIQuestions = (payload) =>
    withFallback(
        () => post("/questions/ai/save", payload),
        () => mockSaveAIQuestions(payload)
    );

export const regenerateAIQuestion = (question) =>
    withFallback(
        () => post("/questions/ai/regenerate", question),
        () => mockRegenerateAIQuestion(question)
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
    users: [],
    exams: [],
    examVersions: [],
    bandsByExam: {},
    questions: [],
    candidates: [],
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
    auditLog: [],
};

function mockLogin(username, password) {
    // Fallback: try matching by email or username field
    const user = MOCK.users.find(
        (u) => (u.email === username || u.username === username) && u.password === password
    );
    if (!user) {
        const err = new Error("Invalid credentials");
        err.mockAuthFailure = true;
        throw err;
    }
    const token = `mock.${btoa(username)}.${Date.now()}`;
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify({ name: user.name, email: user.email || username, role: user.role }));
    return { token, user: { name: user.name, email: user.email || username, role: user.role } };
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

function mockDeleteExam(id) {
    MOCK.exams = MOCK.exams.filter((e) => e.id !== id);
    pushAudit("DELETE_EXAM", "Exams Library", id, "-");
    return { ok: true };
}

function mockArchiveExam(id) {
    const exam = MOCK.exams.find((e) => e.id === id);
    if (exam) exam.status = "INACTIVE";
    pushAudit("ARCHIVE_EXAM", "Exams Library", "-", id);
    return exam;
}

function mockRequestExamStatus(examId, targetStatus, note) {
    const exam = MOCK.exams.find((e) => e.id === examId);
    const title = exam ? exam.title : `Exam (${String(examId).slice(0, 8)}…)`;
    const approval = {
        id: uid("APR"),
        type: targetStatus === "ACTIVE" ? "EXAM_ACTIVATE" : "EXAM_DEACTIVATE",
        label: `${targetStatus === "ACTIVE" ? "Activate" : "Deactivate"} exam · ${title}`,
        targetId: examId,
        requestedBy: currentAdmin(),
        requestedAt: nowIso(),
        note: note || "",
        status: "PENDING",
        payload: { targetStatus },
    };
    MOCK.approvals.unshift(approval);
    if (exam) exam.pendingApproval = approval.id;
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
    if (filters.q) {
        const query = filters.q.toLowerCase();
        rows = rows.filter((q) => (q.questionText || q.title || "").toLowerCase().includes(query) || (q.topic || "").toLowerCase().includes(query));
    }
    if (filters.stack) rows = rows.filter((q) => q.stack === filters.stack);
    if (filters.type) rows = rows.filter((q) => q.type === filters.type);
    if (filters.level) rows = rows.filter((q) => q.level === filters.level);
    if (filters.status) rows = rows.filter((q) => q.status === filters.status);
    return { rows, total: rows.length };
}

function mockCreateQuestion(payload) {
    const title = payload.questionText ? payload.questionText.slice(0, 60) : (payload.title || "Untitled Question");
    const q = { id: uid("Q"), title, status: "ACTIVE", source: "MANUAL", updatedAt: nowIso(), ...payload };
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
// ---------- AI Question Generation Mocks ----------

const AI_MOCK_TEMPLATES = {
    Java: [
        { q: "What does the 'final' keyword mean when applied to a method in Java?", a: "The method cannot be overridden by subclasses", b: "The method runs only once", c: "The method is static", d: "The method is private", ans: "A" },
        { q: "Which collection does NOT allow duplicate elements in Java?", a: "ArrayList", b: "LinkedList", c: "HashSet", d: "Vector", ans: "C" },
        { q: "What is the default value of an int field in a Java class?", a: "null", b: "undefined", c: "0", d: "-1", ans: "C" },
    ],
    React: [
        { q: "Which hook is used to run a side effect after render in React?", a: "useState", b: "useEffect", c: "useContext", d: "useRef", ans: "B" },
        { q: "What does the key prop do in a React list rendering?", a: "Styles the element", b: "Helps React identify which items changed", c: "Prevents re-rendering", d: "Marks the element as required", ans: "B" },
        { q: "Which method is used to update state in a React class component?", a: "this.updateState()", b: "this.changeState()", c: "this.setState()", d: "this.state = {}", ans: "C" },
    ],
    Python: [
        { q: "Which keyword is used to define a generator function in Python?", a: "async", b: "lambda", c: "yield", d: "return", ans: "C" },
        { q: "What data structure does a Python dict implement under the hood?", a: "Linked List", b: "Binary Tree", c: "Hash Table", d: "Stack", ans: "C" },
        { q: "What is the output of bool([]) in Python?", a: "True", b: "False", c: "None", d: "Error", ans: "B" },
    ],
    Node: [
        { q: "What is the event loop in Node.js responsible for?", a: "Compiling TypeScript", b: "Managing non-blocking I/O operations", c: "Garbage collection", d: "SSL termination", ans: "B" },
        { q: "Which module in Node.js is used to create HTTP servers?", a: "fs", b: "path", c: "http", d: "stream", ans: "C" },
        { q: "What does res.json() do in an Express handler?", a: "Reads JSON from the request", b: "Sends a JSON response", c: "Validates JSON", d: "Parses query params as JSON", ans: "B" },
    ],
    SQL: [
        { q: "What does the HAVING clause do in SQL?", a: "Filters rows before grouping", b: "Filters groups after GROUP BY", c: "Joins two tables", d: "Orders the result set", ans: "B" },
        { q: "Which join type returns all rows from both tables regardless of match?", a: "INNER JOIN", b: "LEFT JOIN", c: "FULL OUTER JOIN", d: "CROSS JOIN", ans: "C" },
        { q: "What is the purpose of an index in a database?", a: "Enforces uniqueness", b: "Speeds up data retrieval", c: "Prevents NULL values", d: "Encrypts the column", ans: "B" },
    ],
};

function mockGenerateAIQuestions(payload) {
    const { stack = "Java", level = "L3", difficulty = "MEDIUM", type = "MCQ", count = 3 } = payload;
    const templates = AI_MOCK_TEMPLATES[stack] || AI_MOCK_TEMPLATES.Java;
    const marksMap = { EASY: 1, MEDIUM: 2, HARD: 3 };

    return Array.from({ length: Math.min(count, 10) }, (_, i) => {
        const t = templates[i % templates.length];
        return {
            tempId: `gen-${i}-${Date.now()}`,
            questionText: t.q,
            codeSnippet: type === "CODING" ? `// ${stack} example\nSystem.out.println("Q${i + 1}");` : "",
            stack,
            type,
            level,
            difficulty,
            marks: marksMap[difficulty] || 2,
            optionA: t.a,
            optionB: t.b,
            optionC: t.c,
            optionD: t.d,
            correctOption: t.ans,
            source: "AI",
            aiModel: "Gemini-2.5-Flash (mock)",
            examId: payload.examId || null,
        };
    });
}

function mockSaveAIQuestions(payload) {
    const { questions = [] } = payload;
    questions.forEach((q) => {
        const saved = {
            id: uid("Q"),
            title: q.questionText.slice(0, 60),
            stack: q.stack,
            type: q.type,
            level: q.level,
            status: "ACTIVE",
            source: "AI",
            aiModel: q.aiModel || "Gemini-2.5-Flash",
            updatedAt: nowIso(),
        };
        MOCK.questions.unshift(saved);
        pushAudit("AI_GENERATE_QUESTION", "Question Bank", "-", saved.id);
    });
    return { ok: true, saved: questions.length };
}

function mockRegenerateAIQuestion(original) {
    const templates = AI_MOCK_TEMPLATES[original.stack] || AI_MOCK_TEMPLATES.Java;
    const picked = templates[Math.floor(Math.random() * templates.length)];
    return {
        ...original,
        tempId: `regen-${Date.now()}`,
        questionText: picked.q,
        optionA: picked.a,
        optionB: picked.b,
        optionC: picked.c,
        optionD: picked.d,
        correctOption: picked.ans,
        aiModel: "Gemini-2.5-Flash (mock)",
    };
}

// ---------- / AI Mock ----------

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