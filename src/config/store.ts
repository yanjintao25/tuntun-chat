import Database from "better-sqlite3";
import path from "path";
import { mkdirSync, existsSync } from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "bot.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }
  return db;
}

export interface FeatureConfig {
  schedule: { enabled: boolean; defaultCalendarId?: string };
  todo: { enabled: boolean; reminderMinutes?: number };
  dailySummary: { enabled: boolean; summaryTime?: string; scope?: "user" | "group" };
}

const DEFAULT_CONFIG: FeatureConfig = {
  schedule: { enabled: true, defaultCalendarId: "" },
  todo: { enabled: true, reminderMinutes: 15 },
  dailySummary: { enabled: true, summaryTime: "18:00", scope: "user" },
};

function getRaw(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

function setRaw(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)")
    .run(key, value, new Date().toISOString());
}

const CONFIG_KEY = "feature_config";

export function getFeatureConfig(): FeatureConfig {
  const raw = getRaw(CONFIG_KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as FeatureConfig;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function setFeatureConfig(config: Partial<FeatureConfig>): FeatureConfig {
  const current = getFeatureConfig();
  const next: FeatureConfig = {
    schedule: { ...current.schedule, ...config.schedule },
    todo: { ...current.todo, ...config.todo },
    dailySummary: { ...current.dailySummary, ...config.dailySummary },
  };
  setRaw(CONFIG_KEY, JSON.stringify(next));
  return next;
}
