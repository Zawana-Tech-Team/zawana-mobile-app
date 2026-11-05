import { AuthError } from "../auth/errors.ts";

export type AttendanceStatus = "pending" | "present" | "late" | "absent" | "excused";
export type AttendancePackage = {
  id: string; name: string; categoryCode: string | null; expiryDate: string;
  total: number; used: number; remaining: number; status: string;
};
export type AttendanceRecord = {
  id: string; kind: "course" | "package"; name: string; title: string;
  date: string; time: string; status: AttendanceStatus; coach: string | null;
  categoryCode: string | null; source: string | null; sessionsDeducted: number | null;
  location: string; recordedBy: string | null; checkedInAt: string | null;
  canCheckIn?: boolean; canCorrect?: boolean;
  notes: string | null; package: AttendancePackage | null;
};
export type QrPreview = {
  categoryCode: string;
  enrollment: { id: string; packageName: string; sessionsRemaining: number; expiryDate: string };
  sessionsDeducted: number; expectedRemaining: number;
};
export type QrResult = {
  success: true; categoryCode: string; sessionsDeducted: number; checkInId: string;
  enrollment: { id: string; packageName: string; sessionsRemaining: number };
};
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const nullable = (v: unknown) => v === null || text(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const categories = new Set(["FOUNDATION", "SOCIAL", "PATHWAY"]);
const invalid = () => new AuthError("invalidResponse", "ZAWANA returned an unexpected attendance response. Please refresh.");

export function attendanceRecords(value: unknown): AttendanceRecord[] {
  if (!record(value) || !Array.isArray(value.records)) throw invalid();
  for (const row of value.records) {
    if (!record(row) || !["course", "package"].includes(String(row.kind)) ||
      !["id", "name", "title", "date", "time", "location"].every(k => text(row[k])) ||
      !["coach", "categoryCode", "source", "recordedBy", "checkedInAt", "notes"].every(k => nullable(row[k])) ||
      !["pending", "present", "late", "absent", "excused"].includes(String(row.status)) ||
      !(row.sessionsDeducted === null || count(row.sessionsDeducted))) throw invalid();
    if (['canCheckIn','canCorrect'].some(k => row[k] !== undefined && typeof row[k] !== 'boolean')) throw invalid();
    if (row.package !== null) {
      const p = row.package;
      if (!record(p) || !["id", "name", "expiryDate", "status"].every(k => text(p[k])) ||
        !nullable(p.categoryCode) || !["total", "used", "remaining"].every(k => count(p[k]))) throw invalid();
    }
  }
  return value.records as AttendanceRecord[];
}
export function qrPreview(value: unknown): QrPreview {
  if (!record(value) || !categories.has(String(value.categoryCode)) || !record(value.enrollment) ||
    !text(value.enrollment.id) || !text(value.enrollment.packageName) || !text(value.enrollment.expiryDate) ||
    !count(value.enrollment.sessionsRemaining) || !count(value.sessionsDeducted) || !count(value.expectedRemaining)) throw invalid();
  return value as QrPreview;
}
export function qrResult(value: unknown): QrResult {
  if (!record(value) || value.success !== true || !categories.has(String(value.categoryCode)) ||
    !text(value.checkInId) || !count(value.sessionsDeducted) || !record(value.enrollment) ||
    !text(value.enrollment.id) || !text(value.enrollment.packageName) || !count(value.enrollment.sessionsRemaining)) throw invalid();
  return value as QrResult;
}
export type AttendanceDetail = { history: AttendanceRecord[]; summary: { attended: number; missed: number; late: number; excused: number; completedScheduled: number; percentage: number | null } };
export function attendanceDetail(value: unknown): AttendanceDetail {
  if (!record(value) || !record(value.summary)) throw invalid();
  attendanceRecords({ records: value.history });
  if (!["attended", "missed", "late", "excused", "completedScheduled"].every(k => count((value.summary as Record<string, unknown>)[k])) || !(value.summary.percentage === null || (count(value.summary.percentage) && value.summary.percentage <= 100))) throw invalid();
  return value as AttendanceDetail;
}

/** Accept only the established production QR payload; never follow scanned URLs. */
export function parseCheckInQr(value: string): string {
  try {
    const url = new URL(value.trim());
    const token = url.hash.slice(1);
    if (url.origin === "https://thezawana.com" && url.pathname === "/check-in" &&
      !url.search && /^[A-Za-z0-9_-]{43}$/.test(token)) return token;
  } catch { /* Show the same actionable message for malformed or foreign codes. */ }
  throw new AuthError("invalidInput", "Scan the ZAWANA check-in QR code displayed at the front desk.");
}
export const categoryLabel = (value: string | null) => value ? value.charAt(0) + value.slice(1).toLowerCase() : "Private course";
/** Display ordering only; eligibility and session times are owned by the server. */
export function attendanceStart(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  const hour = Number(match[1]);
  return (match[3] ? hour % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0) : hour) * 60 + Number(match[2]);
}
export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
