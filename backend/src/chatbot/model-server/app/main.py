"""
Model Server – phục vụ 2 mục đích:
  1. GET  /model/download        → tải file .pt về thiết bị
  2. POST /model/predict          → nhận ảnh, trả về cảm xúc dự đoán
  3. GET  /model/info             → thông tin model (classes, input size...)
  4. GET  /health                 → kiểm tra service
"""

from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Optional

import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
from pydantic import BaseModel
from torchvision import transforms

from model import MiniEmotionNet

# ─── Config ───────────────────────────────────────────────────────────────────

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "/app/weights/emotion_model.pt"))
NUM_CLASSES = int(os.environ.get("NUM_CLASSES", "5"))
DROPOUT = float(os.environ.get("DROPOUT", "0.35"))

# Thứ tự class phải khớp với lúc train
EMOTION_LABELS: list[str] = os.environ.get(
    "EMOTION_LABELS", "vui,buồn,tức giận,sợ hãi,bình thường"
).split(",")

INPUT_SIZE = 64  # model nhận ảnh 64x64 grayscale

# ─── Load model một lần khi khởi động ────────────────────────────────────────

device = torch.device("cpu")  # CPU là đủ cho inference nhẹ

_model: Optional[MiniEmotionNet] = None


def load_model() -> MiniEmotionNet:
    global _model
    if _model is not None:
        return _model

    if not MODEL_PATH.exists():
        raise RuntimeError(f"Không tìm thấy file model tại: {MODEL_PATH}")

    net = MiniEmotionNet(num_classes=NUM_CLASSES, dropout=DROPOUT)
    state = torch.load(MODEL_PATH, map_location=device, weights_only=True)

    # Hỗ trợ cả 2 dạng checkpoint: raw state_dict hoặc {"model": state_dict, ...}
    if isinstance(state, dict):
        if "model_state" in state:
            state = state["model_state"]
        elif "model" in state:
            state = state["model"]
        elif "state_dict" in state:
            state = state["state_dict"]

    net.load_state_dict(state)
    net.eval()
    _model = net
    print(f"[model-server] Model loaded from {MODEL_PATH}")
    return _model


# ─── Image preprocessing ──────────────────────────────────────────────────────

preprocess = transforms.Compose([
    transforms.Grayscale(num_output_channels=1),
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),                        # [0,255] → [0.0,1.0]
    transforms.Normalize(mean=[0.5], std=[0.5]),  # → [-1,1]
])


def image_to_tensor(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return preprocess(img).unsqueeze(0)  # (1, 1, 64, 64)


# ─── FastAPI ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Emotion Model Server",
    description="Phục vụ MiniEmotionNet – nhận diện cảm xúc khuôn mặt cho trẻ tự kỷ",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    try:
        load_model()
    except RuntimeError as e:
        print(f"[model-server] WARNING: {e}")
        print("[model-server] Service khởi động nhưng /predict sẽ lỗi cho đến khi có model.")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    model_ready = MODEL_PATH.exists()
    return {
        "status": "ok" if model_ready else "no_model",
        "model_file": str(MODEL_PATH),
        "model_ready": model_ready,
        "num_classes": NUM_CLASSES,
        "labels": EMOTION_LABELS,
    }


@app.get("/model/info")
def model_info():
    """Trả về metadata của model để FE biết trước khi tải."""
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="File model chưa có.")
    size_mb = round(MODEL_PATH.stat().st_size / 1_000_000, 2)
    return {
        "filename": MODEL_PATH.name,
        "size_mb": size_mb,
        "input_size": f"{INPUT_SIZE}x{INPUT_SIZE} grayscale",
        "num_classes": NUM_CLASSES,
        "labels": EMOTION_LABELS,
        "architecture": "MiniEmotionNet",
        "download_url": "/model/download",
    }


@app.get("/model/download")
def model_download():
    """Tải thẳng file .pt về máy client."""
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=404, detail="File model chưa có trên server.")
    return FileResponse(
        path=str(MODEL_PATH),
        media_type="application/octet-stream",
        filename=MODEL_PATH.name,
    )


class PredictResponse(BaseModel):
    emotion: str
    confidence: float
    all_scores: dict[str, float]


@app.post("/model/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(..., description="Ảnh khuôn mặt (jpg/png)")):
    """
    Nhận ảnh khuôn mặt, trả về cảm xúc dự đoán.

    - **file**: ảnh JPG hoặc PNG, bất kỳ kích thước – server tự resize về 64x64 grayscale
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file ảnh (image/*).")

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="File ảnh rỗng.")

    try:
        tensor = image_to_tensor(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được ảnh: {e}")

    try:
        net = load_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    with torch.no_grad():
        logits = net(tensor)                          # (1, num_classes)
        probs = F.softmax(logits, dim=1)[0]           # (num_classes,)

    top_idx = int(probs.argmax())
    labels = EMOTION_LABELS if len(EMOTION_LABELS) == NUM_CLASSES else [str(i) for i in range(NUM_CLASSES)]

    return PredictResponse(
        emotion=labels[top_idx],
        confidence=round(float(probs[top_idx]), 4),
        all_scores={label: round(float(prob), 4) for label, prob in zip(labels, probs)},
    )
