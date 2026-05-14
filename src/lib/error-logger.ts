import { getAdminDb } from "@/lib/firebase-admin";

export type ErrorSeverity = "error" | "warn";

export interface ErrorLogEntry {
  message: string;
  stack?: string;
  context?: string;
  uid?: string;
  extra?: Record<string, unknown>;
}

export async function logError(
  entry: ErrorLogEntry,
  severity: ErrorSeverity = "error"
): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db) return;
    await db.collection("errors").add({
      ...entry,
      severity,
      createdAt: new Date().toISOString(),
      env: process.env.NODE_ENV ?? "unknown",
    });
  } catch (e) {
    console.error("[error-logger] Failed to persist error:", e);
  }
}
