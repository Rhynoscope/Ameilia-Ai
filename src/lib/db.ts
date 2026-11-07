import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deleteMediaFromR2 } from "./r2";
import {
  DEFAULT_COMMUNICATION_PROFILE,
  DEFAULT_REMINDER_SETTINGS,
  INITIAL_MEMORIES,
  INITIAL_IMPORTANT_DATES,
} from "./constants";
import {
  CommunicationProfile,
  DateCategory,
  ImportantDate,
  MemoryCategory,
  MemoryItem,
  ReminderLogItem,
  ReminderSettings,
  ThinkingMode,
  ResponseFeedback,
  SituationContext,
  LearnedPreferencesState,
  SituationPreference,
} from "./types";

let _pgPool: any = null;
let _sqliteDb: any = null;
let _schemaInitialized = false;

export function getD1(): any {
  try {
    const ctx = getCloudflareContext();
    if ((ctx?.env as any)?.DB) return (ctx.env as any).DB;
  } catch {}

  try {
    const globalEnv = (globalThis as any).__CLOUDFLARE_ENV__;
    if (globalEnv?.DB) return globalEnv.DB;
  } catch {}

  try {
    const globalCtx = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (globalCtx?.env?.DB) return globalCtx.env.DB;
  } catch {}

  return null;
}

export function isD1Active(): boolean {
  return Boolean(getD1());
}

export function isPostgresActive(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseType(): "d1" | "postgresql" | "sqlite" {
  if (isD1Active()) return "d1";
  if (isPostgresActive()) return "postgresql";
  return "sqlite";
}

function getPgPool() {
  if (!_pgPool && process.env.DATABASE_URL) {
    try {
      // Lazy load pg
      const pg = require("pg");
      _pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
      });
    } catch (e) {
      console.warn("pg module not available in this environment:", e);
    }
  }
  return _pgPool;
}

async function getSqlite(): Promise<any> {
  if (!_sqliteDb) {
    const { DatabaseSync } = await import("node:sqlite");
    try {
      const path = await import("node:path");
      const fs = await import("node:fs");
      const dbDir = path.join(process.cwd(), "data");
      const dbPath = path.join(dbDir, "amelia.db");

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      _sqliteDb = new DatabaseSync(dbPath);
    } catch (fsErr: any) {
      console.warn("[Database] Local filesystem write not permitted in worker runtime, using resilient in-memory SQLite storage.");
      _sqliteDb = new DatabaseSync(":memory:");
    }
  }
  return _sqliteDb;
}

/**
 * Universal query runner: executes against Cloudflare D1 if available,
 * PostgreSQL if DATABASE_URL is set, or local SQLite fallback
 */
async function queryRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureSchema();

  // 1. Cloudflare D1
  const d1 = getD1();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const res = await bound.all();
    return (res.results || []) as T[];
  }

  // 2. PostgreSQL (if DATABASE_URL is set)
  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    if (pool) {
      let pIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      const res = await pool.query(pgSql, params);
      return res.rows as T[];
    }
  }

  // 3. Local SQLite fallback
  const sqlite = await getSqlite();
  return sqlite.prepare(sql).all(...params) as T[];
}

async function querySingle<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  await ensureSchema();

  // 1. Cloudflare D1
  const d1 = getD1();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    const row = await bound.first();
    return (row || null) as T | null;
  }

  // Fallback to queryRows
  const rows = await queryRows<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function executeRun(sql: string, params: any[] = []): Promise<void> {
  await ensureSchema();

  // 1. Cloudflare D1
  const d1 = getD1();
  if (d1) {
    const stmt = d1.prepare(sql);
    const bound = params.length > 0 ? stmt.bind(...params) : stmt;
    await bound.run();
    return;
  }

  // 2. PostgreSQL
  if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    if (pool) {
      let pIdx = 1;
      const pgSql = sql.replace(/\?/g, () => `$${pIdx++}`);
      await pool.query(pgSql, params);
      return;
    }
  }

  // 3. Local SQLite fallback
  const sqlite = await getSqlite();
  sqlite.prepare(sql).run(...params);
}

/**
 * Initialize Schema on startup
 */
export async function ensureSchema() {
  if (_schemaInitialized) return;
  _schemaInitialized = true;

  const d1 = getD1();
  if (d1) {
    // Cloudflare D1 Schema
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, emotional_significance TEXT, approx_date TEXT, status TEXT DEFAULT 'confirmed', source_type TEXT DEFAULT 'her_statement', related_keys TEXT, source TEXT DEFAULT 'manual', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS important_dates (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, event_date TEXT NOT NULL, category TEXT NOT NULL, reminder_days_before INTEGER DEFAULT 7, notes TEXT, is_recurring_yearly INTEGER DEFAULT 1, created_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS reminder_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, scheduled_time TEXT NOT NULL, prompt_message TEXT NOT NULL, status TEXT DEFAULT 'pending', completed_at TEXT, notes TEXT, created_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, archived INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, thinking_mode TEXT, suggested_replies TEXT, attachments TEXT, suggested_memories TEXT, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS response_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT, suggestion_text TEXT NOT NULL, rating TEXT NOT NULL, situation_context TEXT NOT NULL DEFAULT 'general', tone TEXT, style_tags TEXT, length_category TEXT, reasoning TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE INDEX IF NOT EXISTS idx_feedback_context_rating ON response_feedback(situation_context, rating);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS virtual_date_rooms (code TEXT PRIMARY KEY, game_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', host_id TEXT NOT NULL, players_json TEXT NOT NULL, state_json TEXT NOT NULL, chat_json TEXT NOT NULL DEFAULT '[]', reactions_json TEXT NOT NULL DEFAULT '[]', winner TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS game_history (id INTEGER PRIMARY KEY AUTOINCREMENT, room_code TEXT NOT NULL, game_type TEXT NOT NULL, game_title TEXT NOT NULL, players_json TEXT NOT NULL, winner TEXT NOT NULL, summary TEXT NOT NULL, played_at TEXT NOT NULL);`)
    ]);
  } else if (process.env.DATABASE_URL) {
    const pool = getPgPool();
    if (pool) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS memories (
          id SERIAL PRIMARY KEY,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          emotional_significance TEXT,
          approx_date TEXT,
          status TEXT DEFAULT 'confirmed',
          source_type TEXT DEFAULT 'her_statement',
          related_keys TEXT,
          source TEXT DEFAULT 'manual',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS important_dates (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          event_date TEXT NOT NULL,
          category TEXT NOT NULL,
          reminder_days_before INTEGER DEFAULT 7,
          notes TEXT,
          is_recurring_yearly INTEGER DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reminder_logs (
          id SERIAL PRIMARY KEY,
          scheduled_time TEXT NOT NULL,
          prompt_message TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          completed_at TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          archived INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          thinking_mode TEXT,
          suggested_replies TEXT,
          attachments TEXT,
          suggested_memories TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS push_subscriptions (
          endpoint TEXT PRIMARY KEY,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS response_feedback (
          id SERIAL PRIMARY KEY,
          conversation_id TEXT,
          suggestion_text TEXT NOT NULL,
          rating TEXT NOT NULL,
          situation_context TEXT NOT NULL DEFAULT 'general',
          tone TEXT,
          style_tags TEXT,
          length_category TEXT,
          reasoning TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_feedback_context_rating ON response_feedback(situation_context, rating);
      `);
    }
  } else {
    // Local SQLite fallback
    const db = await getSqlite();
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        emotional_significance TEXT,
        approx_date TEXT,
        status TEXT DEFAULT 'confirmed',
        source_type TEXT DEFAULT 'her_statement',
        related_keys TEXT,
        source TEXT DEFAULT 'manual',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS important_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        event_date TEXT NOT NULL,
        category TEXT NOT NULL,
        reminder_days_before INTEGER DEFAULT 7,
        notes TEXT,
        is_recurring_yearly INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reminder_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheduled_time TEXT NOT NULL,
        prompt_message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        completed_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        archived INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        thinking_mode TEXT,
        suggested_replies TEXT,
        attachments TEXT,
        suggested_memories TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint TEXT PRIMARY KEY,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS response_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT,
        suggestion_text TEXT NOT NULL,
        rating TEXT NOT NULL,
        situation_context TEXT NOT NULL DEFAULT 'general',
        tone TEXT,
        style_tags TEXT,
        length_category TEXT,
        reasoning TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_context_rating ON response_feedback(situation_context, rating);

      CREATE TABLE IF NOT EXISTS virtual_date_rooms (
        code TEXT PRIMARY KEY,
        game_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        host_id TEXT NOT NULL,
        players_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        chat_json TEXT NOT NULL DEFAULT '[]',
        reactions_json TEXT NOT NULL DEFAULT '[]',
        winner TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        game_type TEXT NOT NULL,
        game_title TEXT NOT NULL,
        players_json TEXT NOT NULL,
        winner TEXT NOT NULL,
        summary TEXT NOT NULL,
        played_at TEXT NOT NULL
      );
    `);
  }

  // Safe migration for expanded memory columns on existing tables
  try { await executeRun("ALTER TABLE memories ADD COLUMN approx_date TEXT"); } catch {}
  try { await executeRun("ALTER TABLE memories ADD COLUMN status TEXT DEFAULT 'confirmed'"); } catch {}
  try { await executeRun("ALTER TABLE memories ADD COLUMN source_type TEXT DEFAULT 'her_statement'"); } catch {}
  try { await executeRun("ALTER TABLE memories ADD COLUMN related_keys TEXT"); } catch {}
  try { await executeRun("ALTER TABLE conversations ADD COLUMN pinned INTEGER DEFAULT 0"); } catch {}
  try { await executeRun("ALTER TABLE messages ADD COLUMN versions TEXT"); } catch {}

  try {
    await executeRun(`
      CREATE TABLE IF NOT EXISTS virtual_date_rooms (
        code TEXT PRIMARY KEY,
        game_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        host_id TEXT NOT NULL,
        players_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        chat_json TEXT NOT NULL DEFAULT '[]',
        reactions_json TEXT NOT NULL DEFAULT '[]',
        winner TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await executeRun(`
      CREATE TABLE IF NOT EXISTS game_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT NOT NULL,
        game_type TEXT NOT NULL,
        game_title TEXT NOT NULL,
        players_json TEXT NOT NULL,
        winner TEXT NOT NULL,
        summary TEXT NOT NULL,
        played_at TEXT NOT NULL
      );
    `);
  } catch {}

  // Safe creation of response_feedback table
  try {
    await executeRun(`
      CREATE TABLE IF NOT EXISTS response_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT,
        suggestion_text TEXT NOT NULL,
        rating TEXT NOT NULL,
        situation_context TEXT NOT NULL DEFAULT 'general',
        tone TEXT,
        style_tags TEXT,
        length_category TEXT,
        reasoning TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    await executeRun(`CREATE INDEX IF NOT EXISTS idx_feedback_context_rating ON response_feedback(situation_context, rating);`);
  } catch {}

  // Seed default settings if empty
  const countRow = await querySingle<{ count: string | number }>("SELECT COUNT(*) as count FROM settings");
  if (!countRow || Number(countRow.count) === 0) {
    await executeRun("INSERT INTO settings (key, value) VALUES (?, ?)", ["gemini_model", process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"]);
    await executeRun("INSERT INTO settings (key, value) VALUES (?, ?)", ["communication_profile", JSON.stringify(DEFAULT_COMMUNICATION_PROFILE)]);
    await executeRun("INSERT INTO settings (key, value) VALUES (?, ?)", ["reminder_settings", JSON.stringify(DEFAULT_REMINDER_SETTINGS)]);
  }

  // Seed default memories if empty
  const memCount = await querySingle<{ count: string | number }>("SELECT COUNT(*) as count FROM memories");
  if (!memCount || Number(memCount.count) === 0) {
    const now = new Date().toISOString();
    for (const mem of INITIAL_MEMORIES) {
      await executeRun(
        "INSERT INTO memories (category, title, content, emotional_significance, approx_date, status, source_type, related_keys, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)",
        [
          mem.category,
          mem.title,
          mem.content,
          mem.emotional_significance || "",
          (mem as any).approx_date || "",
          (mem as any).status || "confirmed",
          (mem as any).source_type || "her_statement",
          (mem as any).related_keys || "",
          now,
          now
        ]
      );
    }
  }

  // Seed default dates if empty
  const dateCount = await querySingle<{ count: string | number }>("SELECT COUNT(*) as count FROM important_dates");
  if (!dateCount || Number(dateCount.count) === 0) {
    const now = new Date().toISOString();
    for (const d of INITIAL_IMPORTANT_DATES) {
      await executeRun(
        "INSERT INTO important_dates (title, event_date, category, reminder_days_before, notes, is_recurring_yearly, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [d.title, d.event_date, d.category, d.reminder_days_before, d.notes, d.is_recurring_yearly ? 1 : 0, now]
      );
    }
  }
}

// ==========================================
// SETTINGS HELPERS
// ==========================================

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const row = await querySingle<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
  if (!row) return defaultValue;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as unknown as T;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  await executeRun(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
  `, [key, serialized]);
}

// Synchronous fallback for legacy callers if needed
export function getSettingSync<T>(key: string, defaultValue: T): T {
  if (_sqliteDb) {
    try {
      const row = _sqliteDb.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
      if (!row) return defaultValue;
      try { return JSON.parse(row.value) as T; } catch { return row.value as unknown as T; }
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

// ==========================================
// MEMORIES HELPERS
// ==========================================

export async function getMemories(search?: string, category?: string): Promise<MemoryItem[]> {
  let query = "SELECT * FROM memories";
  const params: any[] = [];
  const conditions: string[] = [];

  if (category && category !== "all") {
    conditions.push("category = ?");
    params.push(category);
  }

  if (search && search.trim().length > 0) {
    conditions.push("(title LIKE ? OR content LIKE ? OR emotional_significance LIKE ? OR related_keys LIKE ? OR approx_date LIKE ?)");
    const s = `%${search.trim()}%`;
    params.push(s, s, s, s, s);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY updated_at DESC";
  return queryRows<MemoryItem>(query, params);
}

export async function addMemory(item: Omit<MemoryItem, "id" | "created_at" | "updated_at">): Promise<MemoryItem> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO memories (category, title, content, emotional_significance, approx_date, status, source_type, related_keys, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    item.category,
    item.title,
    item.content,
    item.emotional_significance || "",
    item.approx_date || "",
    item.status || "confirmed",
    item.source_type || "her_statement",
    item.related_keys || "",
    item.source || "manual",
    now,
    now
  ]);

  const created = await querySingle<MemoryItem>("SELECT * FROM memories ORDER BY id DESC LIMIT 1");
  return created || {
    id: Date.now(),
    ...item,
    created_at: now,
    updated_at: now,
  };
}

export async function updateMemory(id: number, item: Partial<MemoryItem>): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    UPDATE memories
    SET category = COALESCE(?, category),
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        emotional_significance = COALESCE(?, emotional_significance),
        approx_date = COALESCE(?, approx_date),
        status = COALESCE(?, status),
        source_type = COALESCE(?, source_type),
        related_keys = COALESCE(?, related_keys),
        updated_at = ?
    WHERE id = ?
  `, [
    item.category,
    item.title,
    item.content,
    item.emotional_significance,
    item.approx_date,
    item.status,
    item.source_type,
    item.related_keys,
    now,
    id
  ]);
}

export async function deleteMemory(id: number): Promise<void> {
  await executeRun("DELETE FROM memories WHERE id = ?", [id]);
}

// ==========================================
// IMPORTANT DATES HELPERS
// ==========================================

export async function getImportantDates(): Promise<ImportantDate[]> {
  return queryRows<ImportantDate>("SELECT * FROM important_dates ORDER BY event_date ASC");
}

export async function addImportantDate(item: Omit<ImportantDate, "id" | "created_at">): Promise<ImportantDate> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO important_dates (title, event_date, category, reminder_days_before, notes, is_recurring_yearly, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [item.title, item.event_date, item.category, item.reminder_days_before || 7, item.notes || "", item.is_recurring_yearly ? 1 : 0, now]);

  const created = await querySingle<ImportantDate>("SELECT * FROM important_dates ORDER BY id DESC LIMIT 1");
  return created || {
    id: Date.now(),
    ...item,
    created_at: now,
  };
}

export async function deleteImportantDate(id: number): Promise<void> {
  await executeRun("DELETE FROM important_dates WHERE id = ?", [id]);
}

// ==========================================
// REMINDERS & CHECK-IN HELPERS
// ==========================================

export async function getReminderSettings(): Promise<ReminderSettings> {
  return getSetting<ReminderSettings>("reminder_settings", DEFAULT_REMINDER_SETTINGS);
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<void> {
  await setSetting("reminder_settings", settings);
}

export async function getReminderLogs(limit = 50): Promise<ReminderLogItem[]> {
  return queryRows<ReminderLogItem>("SELECT * FROM reminder_logs ORDER BY created_at DESC LIMIT ?", [limit]);
}

export async function addReminderLog(scheduledTime: string, promptMessage: string): Promise<ReminderLogItem> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO reminder_logs (scheduled_time, prompt_message, status, created_at)
    VALUES (?, ?, 'pending', ?)
  `, [scheduledTime, promptMessage, now]);

  const created = await querySingle<ReminderLogItem>("SELECT * FROM reminder_logs ORDER BY id DESC LIMIT 1");
  return created || {
    id: Date.now(),
    scheduled_time: scheduledTime,
    prompt_message: promptMessage,
    status: "pending",
    created_at: now,
  };
}

export async function markReminderCompleted(id: number, notes = ""): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    UPDATE reminder_logs
    SET status = 'completed', completed_at = ?, notes = ?
    WHERE id = ?
  `, [now, notes, id]);
}

export async function recordQuickCheckin(notes = ""): Promise<ReminderLogItem> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO reminder_logs (scheduled_time, prompt_message, status, completed_at, notes, created_at)
    VALUES (?, 'Manual check-in completed', 'completed', ?, ?, ?)
  `, [now, now, notes, now]);

  const created = await querySingle<ReminderLogItem>("SELECT * FROM reminder_logs ORDER BY id DESC LIMIT 1");
  return created || {
    id: Date.now(),
    scheduled_time: now,
    prompt_message: "Manual check-in completed",
    status: "completed",
    completed_at: now,
    notes,
    created_at: now,
  };
}

export async function logReminderCheckin(notes = ""): Promise<void> {
  await recordQuickCheckin(notes);
}

export async function getReminderStats(): Promise<{
  completedCount: number;
  targetCount: number;
  streakDays: number;
  lastCheckin: string | null;
}> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const completedToday = await querySingle<{ count: string | number }>(`
    SELECT COUNT(*) as count FROM reminder_logs
    WHERE status = 'completed' AND completed_at LIKE ?
  `, [`${todayStr}%`]);

  const lastCheckinRow = await querySingle<{ completed_at: string }>(`
    SELECT completed_at FROM reminder_logs
    WHERE status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `);

  const settings = await getReminderSettings();

  // Calculate streak over past 30 days
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayCompleted = await querySingle<{ count: string | number }>(`
      SELECT COUNT(*) as count FROM reminder_logs
      WHERE status = 'completed' AND completed_at LIKE ?
    `, [`${dayStr}%`]);

    if (dayCompleted && Number(dayCompleted.count) > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return {
    completedCount: Number(completedToday?.count || 0),
    targetCount: settings.minPerDay,
    streakDays: Math.max(streak, 1),
    lastCheckin: lastCheckinRow?.completed_at || null,
  };
}

export async function getTodayStats() {
  return getReminderStats();
}

export async function resetData(target: "chat" | "all"): Promise<void> {
  if (target === "chat") {
    await executeRun("DELETE FROM messages");
    await executeRun("DELETE FROM conversations");
  } else if (target === "all") {
    await executeRun("DELETE FROM messages");
    await executeRun("DELETE FROM conversations");
    await executeRun("DELETE FROM reminder_logs");
  }
}

// ==========================================
// CONVERSATIONS & CHAT HISTORY (FEATURE 1)
// ==========================================

export async function getConversations(options: {
  includeArchived?: boolean;
  search?: string;
} = {}): Promise<any[]> {
  const { includeArchived = false, search } = options;
  let query = `
    SELECT 
      c.id, 
      c.title, 
      c.archived,
      c.pinned,
      c.created_at, 
      c.updated_at,
      COUNT(m.id) as message_count,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message_at
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (!includeArchived) {
    conditions.push("(c.archived = 0 OR c.archived IS NULL)");
  } else {
    conditions.push("c.archived = 1");
  }

  if (search && search.trim().length > 0) {
    conditions.push("(c.title LIKE ? OR EXISTS (SELECT 1 FROM messages WHERE conversation_id = c.id AND content LIKE ?))");
    const s = `%${search.trim()}%`;
    params.push(s, s);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " GROUP BY c.id ORDER BY COALESCE(c.pinned, 0) DESC, c.updated_at DESC";
  const rows = await queryRows(query, params);

  return rows.map((r) => ({
    ...r,
    archived: Boolean(r.archived),
    pinned: Boolean(r.pinned),
    message_count: Number(r.message_count || 0),
  }));
}

export async function getConversationMessages(conversationId: string): Promise<any[]> {
  const rows = await queryRows(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY id ASC
  `, [conversationId]);

  return rows.map((r) => ({
    ...r,
    suggested_replies: r.suggested_replies ? JSON.parse(r.suggested_replies) : undefined,
    attachments: r.attachments ? JSON.parse(r.attachments) : undefined,
    suggested_memories: r.suggested_memories ? JSON.parse(r.suggested_memories) : undefined,
    versions: r.versions ? JSON.parse(r.versions) : undefined,
  }));
}

export async function createConversation(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO conversations (id, title, archived, pinned, created_at, updated_at)
    VALUES (?, ?, 0, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at
  `, [id, title, now, now]);
}

export async function pinConversation(id: string, pinned: boolean): Promise<void> {
  await executeRun(`
    UPDATE conversations
    SET pinned = ?
    WHERE id = ?
  `, [pinned ? 1 : 0, id]);
}

export async function renameConversation(id: string, newTitle: string): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    UPDATE conversations
    SET title = ?, updated_at = ?
    WHERE id = ?
  `, [newTitle, now, id]);
}

export async function archiveConversation(id: string, archived: boolean): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    UPDATE conversations
    SET archived = ?, updated_at = ?
    WHERE id = ?
  `, [archived ? 1 : 0, now, id]);
}

export async function archiveAllConversations(archived: boolean): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    UPDATE conversations
    SET archived = ?, updated_at = ?
  `, [archived ? 1 : 0, now]);
}

/**
 * Permanently delete a conversation, its messages, and associated R2 media
 */
export async function clearConversation(conversationId: string): Promise<void> {
  try {
    const messages = await getConversationMessages(conversationId);
    for (const m of messages) {
      if (m.attachments && Array.isArray(m.attachments)) {
        for (const att of m.attachments) {
          if (att.storageKey) {
            await deleteMediaFromR2(att.storageKey);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not delete R2 attachments for conversation:", err);
  }

  await executeRun("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);
  await executeRun("DELETE FROM conversations WHERE id = ?", [conversationId]);
}

/**
 * Permanently purge all conversations, messages, and associated R2 media
 */
export async function deleteAllConversations(): Promise<void> {
  try {
    const rows = await queryRows<{ attachments: string }>(
      "SELECT attachments FROM messages WHERE attachments IS NOT NULL"
    );
    for (const row of rows) {
      if (row.attachments) {
        try {
          const list = JSON.parse(row.attachments);
          if (Array.isArray(list)) {
            for (const att of list) {
              if (att.storageKey) {
                await deleteMediaFromR2(att.storageKey);
              }
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Could not delete R2 attachments during wipe:", err);
  }

  await executeRun("DELETE FROM messages");
  await executeRun("DELETE FROM conversations");
}

export async function saveMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  suggestedReplies?: any,
  attachments?: any,
  suggestedMemories?: any,
  thinkingMode?: ThinkingMode
): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO messages (conversation_id, role, content, thinking_mode, suggested_replies, attachments, suggested_memories, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    conversationId,
    role,
    content,
    thinkingMode || null,
    suggestedReplies ? JSON.stringify(suggestedReplies) : null,
    attachments ? JSON.stringify(attachments) : null,
    suggestedMemories ? JSON.stringify(suggestedMemories) : null,
    now,
  ]);

  await executeRun(`
    UPDATE conversations SET updated_at = ? WHERE id = ?
  `, [now, conversationId]);
}

export async function editUserMessage(messageId: number, newContent: string): Promise<void> {
  await executeRun("UPDATE messages SET content = ? WHERE id = ?", [newContent, messageId]);
}

export async function updateMessageContentAndReplies(
  messageId: number,
  data: {
    content?: string;
    suggestedReplies?: any;
    versions?: any;
  }
): Promise<void> {
  const existing = await querySingle<any>("SELECT * FROM messages WHERE id = ?", [messageId]);
  if (!existing) return;

  const nextContent = data.content !== undefined ? data.content : existing.content;
  const nextReplies =
    data.suggestedReplies !== undefined
      ? JSON.stringify(data.suggestedReplies)
      : existing.suggested_replies;
  const nextVersions =
    data.versions !== undefined
      ? JSON.stringify(data.versions)
      : existing.versions || null;

  await executeRun(
    "UPDATE messages SET content = ?, suggested_replies = ?, versions = ? WHERE id = ?",
    [nextContent, nextReplies, nextVersions, messageId]
  );
}

export async function deleteMessage(messageId: number): Promise<void> {
  try {
    const row = await querySingle<{ attachments: string }>(
      "SELECT attachments FROM messages WHERE id = ?",
      [messageId]
    );
    if (row?.attachments) {
      const list = JSON.parse(row.attachments);
      if (Array.isArray(list)) {
        for (const att of list) {
          if (att.storageKey) {
            await deleteMediaFromR2(att.storageKey);
          }
        }
      }
    }
  } catch {}
  await executeRun("DELETE FROM messages WHERE id = ?", [messageId]);
}

// Push Subscriptions
export async function savePushSubscription(endpoint: string, p256dh: string, auth: string): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
  `, [endpoint, p256dh, auth, now]);
}

export async function getPushSubscriptions(): Promise<any[]> {
  return queryRows("SELECT * FROM push_subscriptions");
}

// ==========================================
// RESPONSE FEEDBACK & LEARNED PREFERENCES (YOUTUBE-STYLE LEARNING)
// ==========================================

export async function recordResponseFeedback(data: {
  conversation_id?: string;
  suggestion_text: string;
  rating: "like" | "dislike";
  situation_context?: SituationContext;
  tone?: string;
  style_tags?: string[];
  length_category?: "short" | "medium" | "long";
  reasoning?: string;
}): Promise<ResponseFeedback> {
  const now = new Date().toISOString();
  const situation = data.situation_context || "general";
  const cleanText = data.suggestion_text.trim();
  const tagsJson = data.style_tags ? JSON.stringify(data.style_tags) : null;

  let lengthCat = data.length_category;
  if (!lengthCat) {
    if (cleanText.length < 65) lengthCat = "short";
    else if (cleanText.length > 150) lengthCat = "long";
    else lengthCat = "medium";
  }

  // Check if existing rating for this exact text exists
  const existing = await querySingle<any>(
    "SELECT * FROM response_feedback WHERE suggestion_text = ? ORDER BY id DESC LIMIT 1",
    [cleanText]
  );

  if (existing) {
    if (existing.rating === data.rating) {
      return {
        ...existing,
        style_tags: existing.style_tags ? JSON.parse(existing.style_tags) : [],
      };
    }
    // Update rating
    await executeRun(
      `UPDATE response_feedback
       SET rating = ?,
           situation_context = COALESCE(?, situation_context),
           tone = COALESCE(?, tone),
           length_category = COALESCE(?, length_category),
           updated_at = ?
       WHERE id = ?`,
      [data.rating, situation, data.tone || existing.tone, lengthCat, now, existing.id]
    );

    return {
      id: existing.id,
      conversation_id: existing.conversation_id,
      suggestion_text: cleanText,
      rating: data.rating,
      situation_context: situation,
      tone: data.tone || existing.tone,
      style_tags: existing.style_tags ? JSON.parse(existing.style_tags) : [],
      length_category: lengthCat,
      reasoning: data.reasoning || existing.reasoning,
      created_at: existing.created_at,
      updated_at: now,
    };
  }

  await executeRun(
    `INSERT INTO response_feedback (conversation_id, suggestion_text, rating, situation_context, tone, style_tags, length_category, reasoning, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.conversation_id || null,
      cleanText,
      data.rating,
      situation,
      data.tone || "Natural & Warm",
      tagsJson,
      lengthCat,
      data.reasoning || null,
      now,
      now,
    ]
  );

  const created = await querySingle<any>(
    "SELECT * FROM response_feedback ORDER BY id DESC LIMIT 1"
  );

  return created
    ? {
        ...created,
        style_tags: created.style_tags ? JSON.parse(created.style_tags) : [],
      }
    : {
        id: Date.now(),
        conversation_id: data.conversation_id,
        suggestion_text: cleanText,
        rating: data.rating,
        situation_context: situation,
        tone: data.tone || "Natural & Warm",
        style_tags: data.style_tags,
        length_category: lengthCat,
        reasoning: data.reasoning,
        created_at: now,
        updated_at: now,
      };
}

export async function getResponseFeedbackList(limit = 100): Promise<ResponseFeedback[]> {
  const rows = await queryRows<any>(
    `SELECT * FROM response_feedback ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );

  return rows.map((r) => ({
    id: r.id,
    conversation_id: r.conversation_id,
    suggestion_text: r.suggestion_text,
    rating: r.rating as "like" | "dislike",
    situation_context: (r.situation_context || "general") as SituationContext,
    tone: r.tone,
    style_tags: r.style_tags ? (typeof r.style_tags === "string" ? JSON.parse(r.style_tags) : r.style_tags) : [],
    length_category: r.length_category,
    reasoning: r.reasoning,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function deleteResponseFeedback(id: number): Promise<void> {
  await executeRun("DELETE FROM response_feedback WHERE id = ?", [id]);
}

export async function deleteResponseFeedbackByTrait(trait: string): Promise<void> {
  const s = `%${trait.trim()}%`;
  await executeRun(
    "DELETE FROM response_feedback WHERE tone LIKE ? OR style_tags LIKE ? OR suggestion_text LIKE ?",
    [s, s, s]
  );
}

export async function resetAllResponseFeedback(): Promise<void> {
  await executeRun("DELETE FROM response_feedback");
}

export async function getLearnedPreferences(): Promise<LearnedPreferencesState> {
  const feedbacks = await getResponseFeedbackList(200);

  let totalLikes = 0;
  let totalDislikes = 0;

  const globalToneScores: Record<string, number> = {};
  const globalLengthCounts: Record<string, number> = { short: 0, medium: 0, long: 0 };
  const situationMap: Record<string, {
    likes: number;
    dislikes: number;
    toneScores: Record<string, number>;
    lengthCounts: Record<string, number>;
    likedExamples: string[];
    dislikedExamples: string[];
    likedTags: Set<string>;
    dislikedTags: Set<string>;
  }> = {};

  for (const fb of feedbacks) {
    const sit = fb.situation_context || "general";
    if (!situationMap[sit]) {
      situationMap[sit] = {
        likes: 0,
        dislikes: 0,
        toneScores: {},
        lengthCounts: { short: 0, medium: 0, long: 0 },
        likedExamples: [],
        dislikedExamples: [],
        likedTags: new Set(),
        dislikedTags: new Set(),
      };
    }

    const sitObj = situationMap[sit];
    const isLike = fb.rating === "like";
    const tone = fb.tone || "Natural & Warm";
    const length = fb.length_category || "medium";

    if (isLike) {
      totalLikes++;
      sitObj.likes++;
      sitObj.toneScores[tone] = (sitObj.toneScores[tone] || 0) + 2;
      globalToneScores[tone] = (globalToneScores[tone] || 0) + 2;
      sitObj.lengthCounts[length] = (sitObj.lengthCounts[length] || 0) + 1;
      globalLengthCounts[length] = (globalLengthCounts[length] || 0) + 1;
      if (sitObj.likedExamples.length < 5) sitObj.likedExamples.push(fb.suggestion_text);
      if (fb.style_tags) {
        for (const t of fb.style_tags) sitObj.likedTags.add(t);
      }
    } else {
      totalDislikes++;
      sitObj.dislikes++;
      sitObj.toneScores[tone] = (sitObj.toneScores[tone] || 0) - 3;
      globalToneScores[tone] = (globalToneScores[tone] || 0) - 3;
      sitObj.lengthCounts[length] = (sitObj.lengthCounts[length] || 0) - 1;
      globalLengthCounts[length] = (globalLengthCounts[length] || 0) - 1;
      if (sitObj.dislikedExamples.length < 5) sitObj.dislikedExamples.push(fb.suggestion_text);
      if (fb.style_tags) {
        for (const t of fb.style_tags) sitObj.dislikedTags.add(t);
      }
    }
  }

  const totalFeedback = totalLikes + totalDislikes;
  let stage: 1 | 2 | 3 | 4 = 1;
  let stageLabel = "Stage 1 — Beginning (Learning Base Style)";

  if (totalFeedback >= 25 && totalLikes >= 15) {
    stage = 4;
    stageLabel = "Stage 4 — Best Match (One Ideal Recommendation)";
  } else if (totalFeedback >= 11) {
    stage = 3;
    stageLabel = "Stage 3 — Personalized Recommendations (Tuning Delivery)";
  } else if (totalFeedback >= 4) {
    stage = 2;
    stageLabel = "Stage 2 — Recognizing Patterns (Identifying Preferred Vibes)";
  }

  const preferredTones = Object.entries(globalToneScores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);

  const avoidedTones = Object.entries(globalToneScores)
    .filter(([_, score]) => score < 0)
    .sort((a, b) => a[1] - b[1])
    .map(([t]) => t);

  let preferredLength: "short" | "medium" | "long" = "medium";
  let maxLenCount = -999;
  for (const [len, count] of Object.entries(globalLengthCounts)) {
    if (count > maxLenCount) {
      maxLenCount = count;
      preferredLength = len as any;
    }
  }

  const situations: Record<string, SituationPreference> = {};
  for (const [sit, obj] of Object.entries(situationMap)) {
    const sitPreferredTones = Object.entries(obj.toneScores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([tone, score]) => ({ tone, score }));

    const sitAvoidedTones = Object.entries(obj.toneScores)
      .filter(([_, score]) => score < 0)
      .sort((a, b) => a[1] - b[1])
      .map(([tone, score]) => ({ tone, score }));

    let sitPrefLength: "short" | "medium" | "long" = "medium";
    let sitMaxLen = -999;
    for (const [len, count] of Object.entries(obj.lengthCounts)) {
      if (count > sitMaxLen) {
        sitMaxLen = count;
        sitPrefLength = len as any;
      }
    }

    situations[sit] = {
      situation: sit as SituationContext,
      totalFeedback: obj.likes + obj.dislikes,
      likes: obj.likes,
      dislikes: obj.dislikes,
      preferredTones: sitPreferredTones,
      avoidedTones: sitAvoidedTones,
      preferredLength: sitPrefLength,
      likedCharacteristics: Array.from(obj.likedTags),
      dislikedCharacteristics: Array.from(obj.dislikedTags),
      recentLikedExamples: obj.likedExamples,
      recentDislikedExamples: obj.dislikedExamples,
    };
  }

  const globalLikedStyles = Array.from(
    new Set(Object.values(situations).flatMap((s) => s.likedCharacteristics))
  );
  const globalDislikedStyles = Array.from(
    new Set(Object.values(situations).flatMap((s) => s.dislikedCharacteristics))
  );

  return {
    stage,
    stageLabel,
    totalLikes,
    totalDislikes,
    globalLikedStyles,
    globalDislikedStyles,
    preferredTones,
    avoidedTones,
    preferredLength,
    situations,
    recentFeedbacks: feedbacks.slice(0, 30),
  };
}

// ==========================================
// VIRTUAL DATE MULTIPLAYER ROOMS & GAME HISTORY
// ==========================================

export async function saveVirtualDateRoom(room: {
  code: string;
  gameType: string;
  status: "waiting" | "playing" | "finished";
  hostId: string;
  players: any[];
  state: any;
  chat: any[];
  reactions: any[];
  winner?: string | null;
  version: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const code = room.code.toUpperCase();
  await executeRun(
    `INSERT INTO virtual_date_rooms (code, game_type, status, host_id, players_json, state_json, chat_json, reactions_json, winner, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(code) DO UPDATE SET
       game_type = EXCLUDED.game_type,
       status = EXCLUDED.status,
       host_id = EXCLUDED.host_id,
       players_json = EXCLUDED.players_json,
       state_json = EXCLUDED.state_json,
       chat_json = EXCLUDED.chat_json,
       reactions_json = EXCLUDED.reactions_json,
       winner = EXCLUDED.winner,
       version = EXCLUDED.version,
       updated_at = EXCLUDED.updated_at`,
    [
      code,
      room.gameType,
      room.status,
      room.hostId,
      JSON.stringify(room.players || []),
      JSON.stringify(room.state || {}),
      JSON.stringify((room.chat || []).slice(-60)),
      JSON.stringify((room.reactions || []).slice(-25)),
      room.winner || null,
      room.version || 1,
      now,
      now,
    ]
  );
}

export async function getVirtualDateRoom(code: string): Promise<any | null> {
  const cleanCode = code.trim().toUpperCase();
  const row = await querySingle<any>(
    "SELECT * FROM virtual_date_rooms WHERE code = ?",
    [cleanCode]
  );
  if (!row) return null;

  return {
    code: row.code,
    gameType: row.game_type,
    status: row.status,
    hostId: row.host_id,
    players: row.players_json ? JSON.parse(row.players_json) : [],
    state: row.state_json ? JSON.parse(row.state_json) : {},
    chat: row.chat_json ? JSON.parse(row.chat_json) : [],
    reactions: row.reactions_json ? JSON.parse(row.reactions_json) : [],
    winner: row.winner || null,
    version: Number(row.version || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function recordGameHistory(data: {
  room_code: string;
  game_type: string;
  game_title: string;
  players: any[];
  winner: string;
  summary: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(
    `INSERT INTO game_history (room_code, game_type, game_title, players_json, winner, summary, played_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.room_code,
      data.game_type,
      data.game_title,
      JSON.stringify(data.players || []),
      data.winner,
      data.summary,
      now,
    ]
  );
}

export async function getGameHistory(limit = 30): Promise<any[]> {
  const rows = await queryRows<any>(
    "SELECT * FROM game_history ORDER BY id DESC LIMIT ?",
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    room_code: r.room_code,
    game_type: r.game_type,
    game_title: r.game_title,
    players: r.players_json ? JSON.parse(r.players_json) : [],
    winner: r.winner,
    summary: r.summary,
    played_at: r.played_at,
  }));
}
