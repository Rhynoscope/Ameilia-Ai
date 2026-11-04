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
} from "./types";

let _pgPool: any = null;
let _sqliteDb: any = null;
let _schemaInitialized = false;

export function getD1(): any {
  try {
    const ctx = getCloudflareContext();
    return (ctx?.env as any)?.DB || null;
  } catch {
    return null;
  }
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
    const path = await import("node:path");
    const fs = await import("node:fs");
    const dbDir = path.join(process.cwd(), "data");
    const dbPath = path.join(dbDir, "amelia.db");

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    _sqliteDb = new DatabaseSync(dbPath);
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
      d1.prepare(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, emotional_significance TEXT, source TEXT DEFAULT 'manual', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS important_dates (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, event_date TEXT NOT NULL, category TEXT NOT NULL, reminder_days_before INTEGER DEFAULT 7, notes TEXT, is_recurring_yearly INTEGER DEFAULT 1, created_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS reminder_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, scheduled_time TEXT NOT NULL, prompt_message TEXT NOT NULL, status TEXT DEFAULT 'pending', completed_at TEXT, notes TEXT, created_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, archived INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, thinking_mode TEXT, suggested_replies TEXT, attachments TEXT, suggested_memories TEXT, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE);`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TEXT NOT NULL);`)
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
    `);
  }

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
        "INSERT INTO memories (category, title, content, emotional_significance, source, created_at, updated_at) VALUES (?, ?, ?, ?, 'manual', ?, ?)",
        [mem.category, mem.title, mem.content, mem.emotional_significance, now, now]
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
    conditions.push("(title LIKE ? OR content LIKE ? OR emotional_significance LIKE ?)");
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
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
    INSERT INTO memories (category, title, content, emotional_significance, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [item.category, item.title, item.content, item.emotional_significance || "", item.source || "manual", now, now]);

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
        updated_at = ?
    WHERE id = ?
  `, [item.category, item.title, item.content, item.emotional_significance, now, id]);
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

  query += " GROUP BY c.id ORDER BY c.updated_at DESC";
  const rows = await queryRows(query, params);

  return rows.map((r) => ({
    ...r,
    archived: Boolean(r.archived),
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
  }));
}

export async function createConversation(id: string, title: string): Promise<void> {
  const now = new Date().toISOString();
  await executeRun(`
    INSERT INTO conversations (id, title, archived, created_at, updated_at)
    VALUES (?, ?, 0, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = EXCLUDED.title, updated_at = EXCLUDED.updated_at
  `, [id, title, now, now]);
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

export async function deleteMessage(messageId: number): Promise<void> {
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
