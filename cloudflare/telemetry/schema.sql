-- Every request to arafatkatze.com that is a page (or any request from a bot).
CREATE TABLE IF NOT EXISTS hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,                -- ISO time
  day TEXT NOT NULL,               -- YYYY-MM-DD, for cheap grouping
  path TEXT NOT NULL,
  status INTEGER,
  cache TEXT,                      -- cf-cache-status
  ua TEXT,
  agent TEXT,                      -- e.g. ClaudeBot, GPTBot, Chrome
  kind TEXT,                       -- ai_assistant | ai_search | ai_training | search | social | other_bot | suspect | human
  referer TEXT,
  ref_source TEXT,                 -- chatgpt, perplexity, claude, ... when a human arrives from an AI answer
  country TEXT,
  asn INTEGER,
  as_org TEXT,
  visitor TEXT                     -- salted daily hash of IP+UA, never the raw IP
);
CREATE INDEX IF NOT EXISTS hits_day_kind ON hits(day, kind);
CREATE INDEX IF NOT EXISTS hits_agent ON hits(agent, day);
CREATE INDEX IF NOT EXISTS hits_ref ON hits(ref_source, day);

-- Daily answers from AI assistants to recruiter-style questions.
CREATE TABLE IF NOT EXISTS mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  day TEXT NOT NULL,
  run_id TEXT NOT NULL,
  provider TEXT NOT NULL,          -- anthropic | openai | perplexity | gemini
  model TEXT,
  question TEXT NOT NULL,
  mentioned INTEGER NOT NULL,      -- 1 if the answer names Ara
  linked_site INTEGER NOT NULL,    -- 1 if arafatkatze.com is cited or linked
  citations TEXT,                  -- JSON array of cited URLs
  answer TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS mentions_day ON mentions(day, provider);
