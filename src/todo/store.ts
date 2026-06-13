import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { initTodoSchema, TODOS_TABLE } from "./schema";
import type { CreateTodoInput, TodoRecord, TodoStatus } from "./types";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "bot.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    initTodoSchema(db);
  }
  return db;
}

interface TodoRow {
  id: number;
  open_id: string;
  chat_id: string;
  title: string;
  due_at: string;
  remind_at: string;
  status: TodoStatus;
  source: TodoRecord["source"];
  raw_message: string | null;
  reminded_at: string | null;
  due_notified_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTodo(row: TodoRow): TodoRecord {
  return {
    id: row.id,
    openId: row.open_id,
    chatId: row.chat_id,
    title: row.title,
    dueAt: row.due_at,
    remindAt: row.remind_at,
    status: row.status,
    source: row.source,
    rawMessage: row.raw_message,
    remindedAt: row.reminded_at,
    dueNotifiedAt: row.due_notified_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createTodo(input: CreateTodoInput): TodoRecord {
  const now = new Date().toISOString();
  const result = getDb()
    .prepare(
      `INSERT INTO ${TODOS_TABLE} (
        open_id, chat_id, title, due_at, remind_at, status, source,
        raw_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`
    )
    .run(
      input.openId,
      input.chatId,
      input.title,
      input.dueAt,
      input.remindAt,
      input.source ?? "chat",
      input.rawMessage ?? null,
      now,
      now
    );

  const row = getDb()
    .prepare(`SELECT * FROM ${TODOS_TABLE} WHERE id = ?`)
    .get(result.lastInsertRowid) as TodoRow | undefined;
  if (!row) throw new Error(`Failed to load todo after insert: id=${result.lastInsertRowid}`);
  return rowToTodo(row);
}

export function getTodoById(id: number, openId: string): TodoRecord | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM ${TODOS_TABLE} WHERE id = ? AND open_id = ?`)
    .get(id, openId) as TodoRow | undefined;
  return row ? rowToTodo(row) : undefined;
}

export function listPendingTodos(openId: string): TodoRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${TODOS_TABLE}
       WHERE open_id = ? AND status = 'pending'
       ORDER BY due_at ASC`
    )
    .all(openId) as TodoRow[];
  return rows.map(rowToTodo);
}

export function listPendingTodosInRange(
  openId: string,
  fromInclusive: string,
  toExclusive: string
): TodoRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${TODOS_TABLE}
       WHERE open_id = ? AND status = 'pending'
         AND due_at >= ? AND due_at < ?
       ORDER BY due_at ASC`
    )
    .all(openId, fromInclusive, toExclusive) as TodoRow[];
  return rows.map(rowToTodo);
}

export function findDueReminders(now: string): TodoRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${TODOS_TABLE}
       WHERE status = 'pending'
         AND remind_at <= ?
         AND reminded_at IS NULL
       ORDER BY remind_at ASC`
    )
    .all(now) as TodoRow[];
  return rows.map(rowToTodo);
}

export function findDueNotifications(now: string): TodoRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM ${TODOS_TABLE}
       WHERE status = 'pending'
         AND due_at <= ?
         AND due_notified_at IS NULL
       ORDER BY due_at ASC`
    )
    .all(now) as TodoRow[];
  return rows.map(rowToTodo);
}

export function markReminded(id: number, at: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE ${TODOS_TABLE}
       SET reminded_at = ?, updated_at = ?
       WHERE id = ? AND status = 'pending' AND reminded_at IS NULL`
    )
    .run(at, at, id);
  return result.changes > 0;
}

export function markDueNotified(id: number, at: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE ${TODOS_TABLE}
       SET due_notified_at = ?, updated_at = ?
       WHERE id = ? AND status = 'pending' AND due_notified_at IS NULL`
    )
    .run(at, at, id);
  return result.changes > 0;
}

export function markDone(id: number, openId: string, at: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE ${TODOS_TABLE}
       SET status = 'done', completed_at = ?, updated_at = ?
       WHERE id = ? AND open_id = ? AND status = 'pending'`
    )
    .run(at, at, id, openId);
  return result.changes > 0;
}

export function markCancelled(id: number, openId: string, at: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE ${TODOS_TABLE}
       SET status = 'cancelled', updated_at = ?
       WHERE id = ? AND open_id = ? AND status = 'pending'`
    )
    .run(at, id, openId);
  return result.changes > 0;
}
