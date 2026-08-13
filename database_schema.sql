-- PostgreSQL Schema Reference for OryFolks Certify

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL, -- ROLE_CANDIDATE, ROLE_ADMIN
    full_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exams Library Table
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    stack VARCHAR(50) NOT NULL,
    duration_minutes INT NOT NULL,
    question_pool INT NOT NULL,
    per_attempt INT NOT NULL,
    pass_mark INT NOT NULL,
    version VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL, -- ACTIVE, DRAFT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Competency Bands Table
CREATE TABLE IF NOT EXISTS competency_bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    level_name VARCHAR(10) NOT NULL, -- L1, L2, L3, L4, L5
    title VARCHAR(50) NOT NULL, -- Expert, Advanced, Intermediate, Beginner, Needs Training
    min_score INT NOT NULL,
    max_score INT NOT NULL
);

-- 5. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    topic VARCHAR(100),
    type VARCHAR(20) DEFAULT 'MCQ', -- MCQ, CODING, DESCRIPTIVE
    level VARCHAR(10) DEFAULT 'L1', -- L1, L2, L3, L4, L5
    difficulty VARCHAR(20) NOT NULL, -- EASY, MEDIUM, HARD
    marks INT NOT NULL DEFAULT 1,
    correct_option VARCHAR(5), -- A, B, C, D
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    code_snippet TEXT,
    language VARCHAR(30),
    sample_input TEXT,
    sample_output TEXT,
    expected_output TEXT,
    model_answer TEXT,
    explanation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    source VARCHAR(20) DEFAULT 'MANUAL',
    ai_model VARCHAR(50)
);

-- 6. Exam Attempts Table
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    score INT,
    retry_override_approved BOOLEAN NOT NULL DEFAULT FALSE;
    assigned_level VARCHAR(10), -- L1 - L5
    result_status VARCHAR(20) NOT NULL, -- PASSED, NOT_PASSED, TERMINATED, IN_PROGRESS
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    tab_switch_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Answers Table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Integrity Violations Table
CREATE TABLE IF NOT EXISTS integrity_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    violation_code VARCHAR(50) NOT NULL, -- LOOKING_AWAY, MULTIPLE_FACES, TAB_SWITCH
    meta_description TEXT,
    timestamp_offset VARCHAR(10) NOT NULL, -- e.g. '12:15'
    snapshot_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Exam Violations Table
CREATE TABLE IF NOT EXISTS exam_violation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    strike_number INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Access Audit Logs Table
CREATE TABLE IF NOT EXISTS access_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Recording Sessions Table
CREATE TABLE IF NOT EXISTS recording_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    video_url VARCHAR(500),
    status VARCHAR(30),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- 12. AI Flags Table
CREATE TABLE IF NOT EXISTS ai_flag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    snapshot_url VARCHAR(500)
);

-- 13. Approval Requests Table
CREATE TABLE IF NOT EXISTS approval_requests (
    id VARCHAR(100) PRIMARY KEY,
    request_type VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    target_id VARCHAR(100),
    requested_by_id VARCHAR(100) NOT NULL,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP,
    resolution_note TEXT,
    payload_json TEXT
);

-- 14. Access Audit Logs Table
CREATE TABLE IF NOT EXISTS access_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Governance Settings Table
CREATE TABLE IF NOT EXISTS governance_settings (
    id BIGINT PRIMARY KEY DEFAULT 1,
    retention_days INT NOT NULL DEFAULT 180,
    encryption BOOLEAN NOT NULL DEFAULT TRUE,
    watermark BOOLEAN NOT NULL DEFAULT TRUE,
    ai_flag_but_do_not_fail BOOLEAN NOT NULL DEFAULT TRUE,
    ai_sensitivity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    face_detection_interval_sec INT DEFAULT 3,
    detection_confidence DOUBLE PRECISION DEFAULT 0.20,
    gaze_deviation_deg INT DEFAULT 35,
    absence_trigger_misses INT DEFAULT 5,
    alert_window_sec INT DEFAULT 15,
    snapshot_resolution VARCHAR(30) DEFAULT '160x120',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

