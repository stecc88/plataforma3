-- ─────────────────────────────────────────────────────────────
-- ScribIA — Supabase Database Migration
-- ─────────────────────────────────────────────────────────────
-- Run this SQL in the Supabase SQL Editor to create all required
-- tables and columns for the ScribIA application.
-- ─────────────────────────────────────────────────────────────

-- ─── Users table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
  teacher_code TEXT,
  institution TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Enrollments table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- ─── Essays table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS essays (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  corrected_content TEXT,
  score NUMERIC(3,1),
  grammar_score NUMERIC(3,1),
  coherence_score NUMERIC(3,1),
  vocabulary_score NUMERIC(3,1),
  clarity_score NUMERIC(3,1),
  ai_feedback TEXT,
  error_annotations TEXT,
  cils_level_assessment JSONB,
  errors JSONB,
  study_topics JSONB,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'CORRECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Add missing columns to existing essays table ────────────
-- These ALTER TABLE statements are safe to run multiple times
-- (they will fail silently if the column already exists).

DO $$
BEGIN
  -- CILS level assessment (JSONB for structured data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'essays' AND column_name = 'cils_level_assessment'
  ) THEN
    ALTER TABLE essays ADD COLUMN cils_level_assessment JSONB;
  END IF;

  -- Structured errors array (JSONB for structured data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'essays' AND column_name = 'errors'
  ) THEN
    ALTER TABLE essays ADD COLUMN errors JSONB;
  END IF;

  -- Study topics (JSONB for structured data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'essays' AND column_name = 'study_topics'
  ) THEN
    ALTER TABLE essays ADD COLUMN study_topics JSONB;
  END IF;
END $$;

-- ─── Self-assessments table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS self_assessments (
  id TEXT PRIMARY KEY,
  essay_id TEXT NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clarity NUMERIC(3,1) NOT NULL DEFAULT 5,
  coherence NUMERIC(3,1) NOT NULL DEFAULT 5,
  grammar NUMERIC(3,1) NOT NULL DEFAULT 5,
  vocabulary NUMERIC(3,1) NOT NULL DEFAULT 5,
  overall_self_score NUMERIC(3,1),
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Teacher notes table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_notes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Class preparations table ───────────────────────────────
CREATE TABLE IF NOT EXISTS class_preparations (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_essays_student_id ON essays(student_id);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_teacher_id ON enrollments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_self_assessments_essay_id ON self_assessments(essay_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_student_id ON teacher_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_class_preparations_teacher_id ON class_preparations(teacher_id);

-- ─── Enable Row Level Security ──────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_preparations ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies (service_role bypasses these) ─────────────
-- The app uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so these policies are for anon key access only.

-- Users: can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Essays: students can CRUD their own essays
CREATE POLICY "Students can read own essays" ON essays
  FOR SELECT USING (auth.uid()::text = student_id);
CREATE POLICY "Students can insert own essays" ON essays
  FOR INSERT WITH CHECK (auth.uid()::text = student_id);
CREATE POLICY "Students can update own essays" ON essays
  FOR UPDATE USING (auth.uid()::text = student_id);

-- Self-assessments: students can manage their own
CREATE POLICY "Students can read own assessments" ON self_assessments
  FOR SELECT USING (auth.uid()::text = student_id);
CREATE POLICY "Students can insert own assessments" ON self_assessments
  FOR INSERT WITH CHECK (auth.uid()::text = student_id);
