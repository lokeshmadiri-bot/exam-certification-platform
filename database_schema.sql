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

-- 3. Competency Bands Table
CREATE TABLE IF NOT EXISTS competency_bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    level_name VARCHAR(10) NOT NULL, -- L1, L2, L3, L4, L5
    title VARCHAR(50) NOT NULL, -- Expert, Advanced, Intermediate, Beginner, Needs Training
    min_score INT NOT NULL,
    max_score INT NOT NULL
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    code_snippet TEXT,
    difficulty VARCHAR(20) NOT NULL, -- EASY, MEDIUM, HARD
    marks INT NOT NULL,
    correct_option VARCHAR(1) NOT NULL, -- A, B, C, D
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Exam Attempts Table
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    score INT,
    assigned_level VARCHAR(10), -- L1 - L5
    result_status VARCHAR(20) NOT NULL, -- PASSED, NOT_PASSED, TERMINATED, IN_PROGRESS
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    tab_switch_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Integrity Violations Table
CREATE TABLE IF NOT EXISTS integrity_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    violation_code VARCHAR(50) NOT NULL, -- LOOKING_AWAY, MULTIPLE_FACES, TAB_SWITCH
    meta_description TEXT,
    timestamp_offset VARCHAR(10) NOT NULL, -- e.g. '12:15'
    snapshot_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Access Audit Logs Table
CREATE TABLE IF NOT EXISTS access_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
