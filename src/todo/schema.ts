import type Database from "better-sqlite3";

/** 与 docs/DATABASE.md 保持同步 */
export const TODOS_TABLE = "todos";

export const CREATE_TODOS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${TODOS_TABLE} (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  open_id         TEXT NOT NULL,
  chat_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  due_at          TEXT NOT NULL,
  remind_at       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  source          TEXT NOT NULL DEFAULT 'chat',
  raw_message     TEXT,
  reminded_at     TEXT,
  due_notified_at TEXT,
  completed_at    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
`;

export const CREATE_TODOS_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_todos_remind_scan
   ON ${TODOS_TABLE} (status, remind_at);`,
  `CREATE INDEX IF NOT EXISTS idx_todos_due_scan
   ON ${TODOS_TABLE} (status, due_at);`,
  `CREATE INDEX IF NOT EXISTS idx_todos_open_status_due
   ON ${TODOS_TABLE} (open_id, status, due_at);`,
];

/**
 * 初始化 todos 表及索引。在获取 SQLite 连接后调用一次即可（CREATE IF NOT EXISTS 幂等）。
 */
export function initTodoSchema(db: Database.Database): void {
  db.exec(CREATE_TODOS_TABLE_SQL);
  for (const sql of CREATE_TODOS_INDEXES_SQL) {
    db.exec(sql);
  }
}
