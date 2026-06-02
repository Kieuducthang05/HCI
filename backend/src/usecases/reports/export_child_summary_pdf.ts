import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { alerts, contents, contentSessions, emotionLogs, unlockContent } from "../../db/schema.ts";
import { AppError } from "../app_error.ts";
import {
  normalizeUseCaseUuid,
  requireOwnedActiveParentChild,
  type ParentChildAccessErrorType,
} from "../parent_child_access.ts";
import { createSimplePdf, type PdfLine } from "./simple_pdf.ts";

export type ExportChildSummaryReportInput = {
  parentId: string;
  childId: string;
  from?: string;
  to?: string;
  days?: number;
};

export type ExportChildSummaryReportResult = {
  fileName: string;
  pdfBytes: Uint8Array;
};

type ExportChildSummaryReportErrorType =
  | ParentChildAccessErrorType
  | "INVALID_FROM"
  | "INVALID_TO"
  | "INVALID_DAYS"
  | "INVALID_DATE_RANGE"
  | "INTERNAL_ERROR";

type ReportRange = {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  source: "DEFAULT_LAST_7_DAYS" | "DAYS" | "EXPLICIT";
};

type DailyBucket = {
  dateLabel: string;
  sessions: ContentSessionReportRow[];
  emotionCounts: Map<string, number>;
  alerts: ChatbotAlertReportRow[];
};

type ContentSessionReportRow = {
  createdAt: string;
  status: string;
  starsEarned: number;
  durationSeconds: number | null;
  isCorrect: boolean | null;
  selectedEmotion: string | null;
  aiDetectedEmotion: string | null;
  contentTitle: string;
  contentType: string;
};

type EmotionReportRow = {
  createdAt: string;
  emotionValue: string;
};

type ChatbotAlertReportRow = {
  createdAt: string;
  reason: string;
  notificationStatus: string;
};

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateInput(value: string | undefined, label: "from" | "to"): Date | undefined {
  const rawValue = value?.trim();
  if (!rawValue) return undefined;

  const normalizedValue =
    /^\d{4}-\d{2}-\d{2}$/.test(rawValue) && label === "to"
      ? `${rawValue}T23:59:59.999Z`
      : /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
        ? `${rawValue}T00:00:00.000Z`
        : rawValue;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new AppError<ExportChildSummaryReportErrorType>(
      label === "from" ? "INVALID_FROM" : "INVALID_TO",
      `${label} must be a valid ISO date or timestamp.`,
      400,
    );
  }

  return parsedDate;
}

function normalizeDays(days: number | undefined): number {
  if (days === undefined) return DEFAULT_DAYS;

  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new AppError<ExportChildSummaryReportErrorType>(
      "INVALID_DAYS",
      `days must be an integer from 1 to ${MAX_DAYS}.`,
      400,
    );
  }

  return days;
}

function normalizeRange(input: ExportChildSummaryReportInput): ReportRange {
  const toDate = parseDateInput(input.to, "to") ?? new Date();
  const fromDate = parseDateInput(input.from, "from");
  const days = normalizeDays(input.days);
  const effectiveFrom = fromDate ?? new Date(toDate.getTime() - days * DAY_MS);

  if (effectiveFrom.getTime() > toDate.getTime()) {
    throw new AppError<ExportChildSummaryReportErrorType>(
      "INVALID_DATE_RANGE",
      "from must be before or equal to to.",
      400,
    );
  }

  if (toDate.getTime() - effectiveFrom.getTime() > MAX_DAYS * DAY_MS) {
    throw new AppError<ExportChildSummaryReportErrorType>(
      "INVALID_DATE_RANGE",
      `Report date range cannot exceed ${MAX_DAYS} days.`,
      400,
    );
  }

  return {
    from: effectiveFrom,
    to: toDate,
    fromIso: effectiveFrom.toISOString(),
    toIso: toDate.toISOString(),
    source:
      fromDate || input.to ? "EXPLICIT" : input.days === undefined ? "DEFAULT_LAST_7_DAYS" : "DAYS",
  };
}

function formatDate(dateOrIso: Date | string): string {
  const date = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${day}/${month}/${year}`;
}

function dayKey(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "chưa ghi nhận thời lượng";
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} phút` : `${minutes} phút ${remainder} giây`;
}

function toDisplayEmotion(value: string): string {
  const key = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    happy: "Vui vẻ",
    joy: "Vui vẻ",
    calm: "Bình tĩnh",
    sad: "Buồn",
    angry: "Tức giận",
    scared: "Lo lắng",
    surprised: "Ngạc nhiên",
  };
  return labels[key] ?? key;
}

function toDisplayStatus(value: string): string {
  const key = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    COMPLETED: "hoàn thành",
    ABANDONED: "bỏ dở",
    IN_PROGRESS: "đang làm",
  };
  return labels[key] ?? value.toLowerCase();
}

function toDisplayContentType(value: string): string {
  const key = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    LESSON: "Bài học",
    QUIZ: "Câu hỏi",
    GAME: "Trò chơi",
  };
  return labels[key] ?? value;
}

function formatCounts(counts: Map<string, number>): string {
  const parts = Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => `${label}: ${count}`);
  return parts.length > 0 ? parts.join(", ") : "không có dữ liệu";
}

function addLine(lines: PdfLine[], text: string, fontSize = 10, gapAfter = 0): void {
  lines.push({ text, fontSize, gapAfter });
}

function summarizeDailyRows(
  sessions: ContentSessionReportRow[],
  emotions: EmotionReportRow[],
  alertRows: ChatbotAlertReportRow[],
): DailyBucket[] {
  const buckets = new Map<string, DailyBucket>();

  function getBucket(key: string): DailyBucket {
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        dateLabel: formatDate(`${key}T00:00:00.000Z`),
        sessions: [],
        emotionCounts: new Map<string, number>(),
        alerts: [],
      };
      buckets.set(key, bucket);
    }
    return bucket;
  }

  for (const session of sessions) {
    getBucket(dayKey(session.createdAt)).sessions.push(session);
  }

  for (const emotion of emotions) {
    const bucket = getBucket(dayKey(emotion.createdAt));
    const label = toDisplayEmotion(emotion.emotionValue);
    bucket.emotionCounts.set(label, (bucket.emotionCounts.get(label) ?? 0) + 1);
  }

  for (const alert of alertRows) {
    getBucket(dayKey(alert.createdAt)).alerts.push(alert);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, bucket]) => bucket);
}

async function getReportRows(childId: string, range: ReportRange) {
  const [sessionRows, emotionRows, alertRows] = await Promise.all([
    db
      .select({
        createdAt: contentSessions.createdAt,
        status: contentSessions.status,
        starsEarned: contentSessions.starsEarned,
        durationSeconds: contentSessions.durationSeconds,
        isCorrect: contentSessions.isCorrect,
        selectedEmotion: contentSessions.selectedEmotion,
        aiDetectedEmotion: contentSessions.aiDetectedEmotion,
        contentTitle: contents.title,
        contentType: contents.type,
      })
      .from(contentSessions)
      .innerJoin(unlockContent, eq(unlockContent.id, contentSessions.unlockContentId))
      .innerJoin(contents, eq(contents.id, unlockContent.contentId))
      .where(
        and(
          eq(contentSessions.childId, childId),
          gte(contentSessions.createdAt, range.fromIso),
          lte(contentSessions.createdAt, range.toIso),
        ),
      )
      .orderBy(asc(contentSessions.createdAt)),
    db
      .select({
        createdAt: emotionLogs.createdAt,
        emotionValue: emotionLogs.emotionValue,
      })
      .from(emotionLogs)
      .where(
        and(
          eq(emotionLogs.childId, childId),
          gte(emotionLogs.createdAt, range.fromIso),
          lte(emotionLogs.createdAt, range.toIso),
        ),
      )
      .orderBy(asc(emotionLogs.createdAt)),
    db
      .select({
        createdAt: alerts.createdAt,
        reason: alerts.reason,
        notificationStatus: alerts.notificationStatus,
      })
      .from(alerts)
      .where(
        and(
          eq(alerts.childId, childId),
          gte(alerts.createdAt, range.fromIso),
          lte(alerts.createdAt, range.toIso),
        ),
      )
      .orderBy(asc(alerts.createdAt)),
  ]);

  return { sessionRows, emotionRows, alertRows };
}

function buildReportLines(input: {
  childNickname: string;
  childBirthYear: number;
  range: ReportRange;
  sessionRows: ContentSessionReportRow[];
  emotionRows: EmotionReportRow[];
  alertRows: ChatbotAlertReportRow[];
}): PdfLine[] {
  const emotionCounts = new Map<string, number>();
  for (const row of input.emotionRows) {
    const label = toDisplayEmotion(row.emotionValue);
    emotionCounts.set(label, (emotionCounts.get(label) ?? 0) + 1);
  }

  const completedCount = input.sessionRows.filter((row) => row.status === "COMPLETED").length;
  const quitCount = input.sessionRows.filter((row) => row.status === "ABANDONED").length;
  const totalStars = input.sessionRows.reduce((sum, row) => sum + row.starsEarned, 0);
  const dailyRows = summarizeDailyRows(input.sessionRows, input.emotionRows, input.alertRows);
  const lines: PdfLine[] = [];

  addLine(lines, "Báo cáo hoạt động của trẻ", 18, 10);
  addLine(lines, `Bé: ${input.childNickname} (năm sinh ${input.childBirthYear})`, 11);
  addLine(lines, `Thời gian: ${formatDate(input.range.from)} - ${formatDate(input.range.to)}`, 11);
  addLine(lines, `Tạo lúc: ${new Date().toISOString()}`, 9, 12);

  addLine(lines, "Tổng quan", 14, 4);
  addLine(
    lines,
    `Hoạt động: ${input.sessionRows.length} tổng cộng, ${completedCount} hoàn thành, ${quitCount} bỏ dở, nhận ${totalStars} sao.`,
  );
  addLine(lines, `Cảm xúc: ${formatCounts(emotionCounts)}.`);
  addLine(lines, `Cảnh báo chatbot: ${input.alertRows.length}.`, 10, 12);

  addLine(lines, "Hoạt động theo ngày", 14, 4);
  if (dailyRows.length === 0) {
    addLine(lines, "Chưa có hoạt động, cảm xúc hoặc cảnh báo chatbot trong khoảng thời gian này.");
    return lines;
  }

  for (const day of dailyRows) {
    const dayCompleted = day.sessions.filter((row) => row.status === "COMPLETED").length;
    const dayQuit = day.sessions.filter((row) => row.status === "ABANDONED").length;
    addLine(lines, day.dateLabel, 12, 2);
    addLine(
      lines,
      `Hoạt động: ${day.sessions.length} tổng cộng, ${dayCompleted} hoàn thành, ${dayQuit} bỏ dở.`,
    );

    for (const session of day.sessions) {
      const quizResult =
        session.isCorrect === null ? "" : session.isCorrect ? ", trả lời đúng" : ", trả lời sai";
      const selectedEmotion = session.selectedEmotion
        ? `, bé chọn ${toDisplayEmotion(session.selectedEmotion)}`
        : "";
      const aiEmotion = session.aiDetectedEmotion
        ? `, AI nhận diện ${toDisplayEmotion(session.aiDetectedEmotion)}`
        : "";
      addLine(
        lines,
        `- ${session.contentTitle} (${toDisplayContentType(session.contentType)}): ${toDisplayStatus(session.status)}, ${formatDuration(session.durationSeconds)}, +${session.starsEarned} sao${quizResult}${selectedEmotion}${aiEmotion}.`,
      );
    }

    addLine(lines, `Cảm xúc ghi nhận: ${formatCounts(day.emotionCounts)}.`);

    if (day.alerts.length > 0) {
      addLine(lines, `Cảnh báo chatbot: ${day.alerts.length}.`);
      for (const alert of day.alerts) {
        addLine(lines, `- ${alert.reason} (${alert.notificationStatus.toLowerCase()}).`);
      }
    }

    addLine(lines, "", 10, 6);
  }

  return lines;
}

export async function exportChildSummaryPdf(
  input: ExportChildSummaryReportInput,
): Promise<ExportChildSummaryReportResult> {
  const parentId = normalizeUseCaseUuid(
    input.parentId,
    "MISSING_PARENT_ID",
    "INVALID_PARENT_ID",
    "parent ID",
  );
  const childId = normalizeUseCaseUuid(
    input.childId,
    "MISSING_CHILD_ID",
    "INVALID_CHILD_ID",
    "child ID",
  );
  const range = normalizeRange(input);

  try {
    const child = await requireOwnedActiveParentChild({ parentId, childId });
    const { sessionRows, emotionRows, alertRows } = await getReportRows(childId, range);
    const lines = buildReportLines({
      childNickname: child.nickname,
      childBirthYear: child.birthYear,
      range,
      sessionRows,
      emotionRows,
      alertRows,
    });
    const fromDate = range.fromIso.slice(0, 10);
    const toDate = range.toIso.slice(0, 10);

    const pdfBytes = await createSimplePdf(lines);
    return {
      fileName: `hmi-child-summary-${childId}-${fromDate}-to-${toDate}.pdf`,
      pdfBytes,
    };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error("[ERROR] Unexpected error in use case: Export child summary PDF", error);
    throw new AppError<ExportChildSummaryReportErrorType>(
      "INTERNAL_ERROR",
      "Internal server error.",
      500,
    );
  }
}
