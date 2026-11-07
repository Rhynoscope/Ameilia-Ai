-- Migration 0004: Virtual Date Multiplayer Rooms, Game History & Chat Upgrades

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
