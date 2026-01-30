-- ファイル: migrations/001_initial_schema.sql
-- 説明: 動的エージェントシステムの初期スキーマ
-- バージョン: 1.0.0
-- 作成日: 2026-01-29

-- ====================================
-- 1. dynamic_agents テーブル
-- ====================================
CREATE TABLE IF NOT EXISTS dynamic_agents (
  id TEXT PRIMARY KEY,
  class_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dynamic_agents_status
  ON dynamic_agents(status);
CREATE INDEX IF NOT EXISTS idx_dynamic_agents_created_at
  ON dynamic_agents(created_at DESC);

-- ====================================
-- 2. dynamic_tools テーブル
-- ====================================
CREATE TABLE IF NOT EXISTS dynamic_tools (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters_schema TEXT NOT NULL,
  implementation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES dynamic_agents(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dynamic_tools_agent_id
  ON dynamic_tools(agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dynamic_tools_agent_name
  ON dynamic_tools(agent_id, name);

-- ====================================
-- 3. dynamic_test_examples テーブル
-- ====================================
CREATE TABLE IF NOT EXISTS dynamic_test_examples (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  input TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES dynamic_agents(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dynamic_test_examples_agent_id
  ON dynamic_test_examples(agent_id);

-- ====================================
-- 4. dynamic_agent_audit テーブル
-- ====================================
CREATE TABLE IF NOT EXISTS dynamic_agent_audit (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'execute', 'enable', 'disable')),
  user_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_dynamic_agent_audit_agent_id
  ON dynamic_agent_audit(agent_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_agent_audit_created_at
  ON dynamic_agent_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_agent_audit_user_id
  ON dynamic_agent_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_agent_audit_operation
  ON dynamic_agent_audit(operation);
