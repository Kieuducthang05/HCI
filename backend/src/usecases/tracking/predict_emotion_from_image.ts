import { mapEmotionInputToAiLabel, mapEmotionInputToInternal } from "../../domain/ai_inference.ts";
import { AppError } from "../app_error.ts";
import {
  normalizeUseCaseUuid,
  requireOwnedActiveParentChild,
} from "../parent_child_access.ts";
import { recordEmotionLog, type LogEmotionResult } from "./log_emotion.ts";

export type PredictEmotionFromImageErrorType =
  | "MISSING_FILE"
  | "INVALID_IMAGE_FILE"
  | "IMAGE_TOO_LARGE"
  | "WEBCAM_CONSENT_REQUIRED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_REJECTED_IMAGE"
  | "INVALID_MODEL_RESPONSE"
  | "UNSUPPORTED_MODEL_EMOTION";

type JsonRecord = Record<string, unknown>;

type ModelPrediction = {
  emotion: string;
  confidence: number;
  all_scores: Record<string, number>;
};

export type PredictEmotionFromImageInput = {
  parentId: string;
  childId: string;
  file: File;
};

export type PredictEmotionFromImageResult = {
  prediction: {
    emotion: string;
    internalEmotion: string;
    confidence: number;
    allScores: Record<string, number>;
  };
  log: LogEmotionResult;
};

const DEFAULT_MODEL_SERVER_URL = "http://localhost:8001";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function normalizePositiveInteger(rawValue: string | undefined, fallback: number): number {
  const value = Number(rawValue);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readModelTimeoutMs(): number {
  return normalizePositiveInteger(process.env["EMOTION_MODEL_TIMEOUT_MS"], DEFAULT_TIMEOUT_MS);
}

function readMaxImageBytes(): number {
  return normalizePositiveInteger(
    process.env["EMOTION_MODEL_MAX_IMAGE_BYTES"],
    DEFAULT_MAX_IMAGE_BYTES,
  );
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function buildModelServerCandidates(): string[] {
  const configuredUrl = process.env["EMOTION_MODEL_SERVER_URL"]?.trim();
  const candidates = [normalizeBaseUrl(configuredUrl || DEFAULT_MODEL_SERVER_URL)];

  for (const candidate of [...candidates]) {
    try {
      const parsedUrl = new URL(candidate);
      if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
        parsedUrl.hostname = "host.docker.internal";
        candidates.push(normalizeBaseUrl(parsedUrl.toString()));
      }
    } catch {
      // Let fetch surface the invalid URL as a model connectivity error.
    }
  }

  return Array.from(new Set(candidates));
}

function getModelErrorMessage(data: unknown): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }

  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string" && error.message.trim()) return error.message;
  }

  return "Emotion model server returned an error.";
}

async function parseModelResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  return response.text();
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeScores(rawScores: unknown): Record<string, number> {
  if (rawScores === undefined || rawScores === null) return {};

  if (!isRecord(rawScores)) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_MODEL_RESPONSE",
      "Model response all_scores must be an object.",
      502,
    );
  }

  const scores: Record<string, number> = {};
  for (const [label, score] of Object.entries(rawScores)) {
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) {
      throw new AppError<PredictEmotionFromImageErrorType>(
        "INVALID_MODEL_RESPONSE",
        "Model response scores must be numbers from 0 to 1.",
        502,
      );
    }

    scores[label] = score;
  }

  return scores;
}

function normalizeModelPrediction(data: unknown): ModelPrediction {
  if (!isRecord(data)) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_MODEL_RESPONSE",
      "Model response must be a JSON object.",
      502,
    );
  }

  const emotion = data["emotion"];
  const confidence = data["confidence"];

  if (typeof emotion !== "string" || !emotion.trim()) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_MODEL_RESPONSE",
      "Model response emotion must be a string.",
      502,
    );
  }

  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_MODEL_RESPONSE",
      "Model response confidence must be a number from 0 to 1.",
      502,
    );
  }

  return {
    emotion,
    confidence,
    all_scores: normalizeScores(data["all_scores"]),
  };
}

function assertImageFile(file: File): void {
  if (!file) {
    throw new AppError<PredictEmotionFromImageErrorType>("MISSING_FILE", "File is required.", 400);
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_IMAGE_FILE",
      "Only image files are accepted.",
      400,
    );
  }

  if (file.size <= 0) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "INVALID_IMAGE_FILE",
      "Image file is empty.",
      400,
    );
  }

  if (file.size > readMaxImageBytes()) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "IMAGE_TOO_LARGE",
      "Image file is too large.",
      413,
    );
  }
}

async function requestModelPrediction(file: File): Promise<{
  prediction: ModelPrediction;
  modelServerUrl: string;
}> {
  let lastConnectivityError: unknown = null;

  for (const modelServerUrl of buildModelServerCandidates()) {
    const formData = new FormData();
    formData.append("file", file, file.name || "camera-frame.jpg");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), readModelTimeoutMs());

    try {
      const response = await fetch(`${modelServerUrl}/model/predict`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = await parseModelResponse(response);

      if (!response.ok) {
        const isModelServerError = response.status >= 500;
        throw new AppError<PredictEmotionFromImageErrorType>(
          isModelServerError ? "MODEL_UNAVAILABLE" : "MODEL_REJECTED_IMAGE",
          getModelErrorMessage(data),
          isModelServerError ? 503 : 400,
        );
      }

      return {
        prediction: normalizeModelPrediction(data),
        modelServerUrl,
      };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;

      lastConnectivityError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("[ERROR] Emotion model server is unavailable:", lastConnectivityError);
  throw new AppError<PredictEmotionFromImageErrorType>(
    "MODEL_UNAVAILABLE",
    "Cannot connect to emotion model server.",
    503,
  );
}

export async function predictEmotionFromImage(
  input: PredictEmotionFromImageInput,
): Promise<PredictEmotionFromImageResult> {
  assertImageFile(input.file);

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

  const child = await requireOwnedActiveParentChild({
    parentId,
    childId,
  });

  if (!child.webcamConsent) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "WEBCAM_CONSENT_REQUIRED",
      "Webcam consent is required for this child profile.",
      403,
    );
  }

  const { prediction, modelServerUrl } = await requestModelPrediction(input.file);
  const internalEmotion = mapEmotionInputToInternal(prediction.emotion);
  const aiEmotionLabel = mapEmotionInputToAiLabel(prediction.emotion);

  if (!internalEmotion || !aiEmotionLabel) {
    throw new AppError<PredictEmotionFromImageErrorType>(
      "UNSUPPORTED_MODEL_EMOTION",
      "Model returned an unsupported emotion label.",
      502,
    );
  }

  const log = await recordEmotionLog({
    parentId,
    childId,
    emotionValue: internalEmotion,
    triggerSource: "WEBCAM",
    aiEmotionLabel,
    aiConfidence: prediction.confidence,
    confidenceScore: prediction.confidence,
    aiScores: prediction.all_scores,
    aiResult: prediction,
    metadata: {
      source: "backend-emotion-prediction",
      model_server_url: modelServerUrl,
      image_content_type: input.file.type,
      image_size_bytes: input.file.size,
      image_file_name: input.file.name || null,
      frame_uploaded_to_model: true,
      frame_persisted: false,
    },
  });

  return {
    prediction: {
      emotion: aiEmotionLabel,
      internalEmotion,
      confidence: prediction.confidence,
      allScores: prediction.all_scores,
    },
    log,
  };
}
