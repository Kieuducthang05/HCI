"""
test_realtime_fixed.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test realtime emotion recognition bằng webcam
Tương thích checkpoint pretrained_adult2.pt mới

Cài:
    pip install torch torchvision opencv-python pillow requests numpy

Chạy:
    py test_realtime_fixed.py
    py test_realtime_fixed.py --server http://localhost:9000
    py test_realtime_fixed.py --model pretrained_adult2.pt

Phím:
    Q / ESC -> thoát
"""

from __future__ import annotations

import argparse
import sys
import time
from collections import deque
from pathlib import Path

import cv2
import numpy as np
import requests
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

# ══════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════

SERVER = "http://localhost:9000"
MODEL_FILE = "pretrained_adult2.pt"

INPUT_SIZE = 64
NUM_CLASSES = 5
SMOOTH_N = 6
INFER_EVERY = 2

LABELS_DEFAULT = [
    "happy",
    "sad",
    "angry",
    "fear",
    "neutral",
]

COLORS = {
    0: (50, 220, 100),
    1: (255, 100, 100),
    2: (50, 50, 255),
    3: (0, 220, 255),
    4: (180, 180, 180),
}

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ══════════════════════════════════════════════════════════
# MODEL ARCHITECTURE
# ══════════════════════════════════════════════════════════

class ConvBNAct(nn.Sequential):

    def __init__(
        self,
        in_channels,
        out_channels,
        kernel_size=3,
        stride=1,
        groups=1,
        activation=True,
    ):
        padding = kernel_size // 2

        layers = [
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size,
                stride,
                padding,
                groups=groups,
                bias=False,
            ),
            nn.BatchNorm2d(out_channels),
        ]

        if activation:
            layers.append(nn.Hardswish())

        super().__init__(*layers)


class SEBlock(nn.Module):

    def __init__(self, channels, reduction=4):
        super().__init__()

        hidden = max(channels // reduction, 8)

        self.pool = nn.AdaptiveAvgPool2d(1)

        self.fc = nn.Sequential(
            nn.Linear(channels, hidden),
            nn.ReLU(inplace=True),
            nn.Linear(hidden, channels),
            nn.Hardsigmoid(),
        )

    def forward(self, x):
        weights = self.pool(x).flatten(1)
        weights = self.fc(weights).view(
            x.size(0),
            x.size(1),
            1,
            1,
        )
        return x * weights


class InvertedResidual(nn.Module):

    def __init__(
        self,
        in_channels,
        out_channels,
        expand_ratio=4,
        kernel_size=3,
        stride=1,
        use_se=True,
    ):
        super().__init__()

        hidden_channels = in_channels * expand_ratio

        self.use_residual = (
            stride == 1 and in_channels == out_channels
        )

        layers = []

        if expand_ratio != 1:
            layers.append(
                ConvBNAct(
                    in_channels,
                    hidden_channels,
                    kernel_size=1,
                )
            )

        layers.extend([
            ConvBNAct(
                hidden_channels,
                hidden_channels,
                kernel_size=kernel_size,
                stride=stride,
                groups=hidden_channels,
            ),
            SEBlock(hidden_channels) if use_se else nn.Identity(),
            ConvBNAct(
                hidden_channels,
                out_channels,
                kernel_size=1,
                activation=False,
            ),
        ])

        self.block = nn.Sequential(*layers)

    def forward(self, x):
        out = self.block(x)

        if self.use_residual:
            out = out + x

        return out


class MiniEmotionNet(nn.Module):

    def __init__(self, num_classes=5, dropout=0.35):
        super().__init__()

        self.stem = ConvBNAct(
            1,
            32,
            kernel_size=3,
            stride=2,
        )

        self.stage1 = nn.Sequential(
            InvertedResidual(
                32,
                32,
                expand_ratio=1,
                kernel_size=3,
                stride=1,
                use_se=True,
            ),
            InvertedResidual(
                32,
                48,
                expand_ratio=4,
                kernel_size=3,
                stride=2,
                use_se=False,
            ),
        )

        self.stage2 = nn.Sequential(
            InvertedResidual(
                48,
                64,
                expand_ratio=4,
                kernel_size=5,
                stride=2,
                use_se=True,
            ),
            InvertedResidual(
                64,
                64,
                expand_ratio=3,
                kernel_size=5,
                stride=1,
                use_se=True,
            ),
            InvertedResidual(
                64,
                80,
                expand_ratio=4,
                kernel_size=3,
                stride=1,
                use_se=False,
            ),
        )

        self.stage3 = nn.Sequential(
            InvertedResidual(
                80,
                128,
                expand_ratio=4,
                kernel_size=3,
                stride=2,
                use_se=False,
            ),
            InvertedResidual(
                128,
                128,
                expand_ratio=3,
                kernel_size=5,
                stride=1,
                use_se=True,
            ),
            InvertedResidual(
                128,
                160,
                expand_ratio=3,
                kernel_size=5,
                stride=1,
                use_se=True,
            ),
        )

        self.pool = nn.AdaptiveAvgPool2d(1)

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(160, 192),
            nn.Hardswish(),
            nn.Dropout(dropout),
            nn.Linear(192, num_classes),
        )

    def forward(self, x):

        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.pool(x)

        return self.classifier(x)

# ══════════════════════════════════════════════════════════
# TRANSFORM
# ══════════════════════════════════════════════════════════

tf = transforms.Compose([
    transforms.Grayscale(1),
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.5], [0.5]),
])


def to_tensor(frame):

    img = Image.fromarray(
        cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    )

    return tf(img).unsqueeze(0).to(device)

# ══════════════════════════════════════════════════════════
# DOWNLOAD MODEL
# ══════════════════════════════════════════════════════════

def fetch_model(server, save_path):

    base = server.rstrip("/")

    try:
        info = requests.get(
            f"{base}/model/info",
            timeout=8,
        ).json()

        labels = info.get(
            "labels",
            LABELS_DEFAULT,
        )

        print(f"[i] Model : {info.get('filename')}")
        print(f"[i] Labels: {labels}")

    except Exception as e:
        print(f"[!] Không connect được server")
        print(e)

        labels = LABELS_DEFAULT

    if Path(save_path).exists():
        print(f"[✓] Dùng model local: {save_path}")
        return labels

    try:
        print("[↓] Downloading model...")

        r = requests.get(
            f"{base}/model/download",
            stream=True,
            timeout=120,
        )

        r.raise_for_status()

        with open(save_path, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)

        print("[✓] Download complete")

    except Exception as e:
        print(f"[✗] Download lỗi: {e}")
        sys.exit(1)

    return labels

# ══════════════════════════════════════════════════════════
# LOAD MODEL
# ══════════════════════════════════════════════════════════

def load_model(path, num_classes):

    model = MiniEmotionNet(
        num_classes=num_classes
    ).to(device)

    print(f"[i] Loading model: {path}")

    checkpoint = torch.load(
        path,
        map_location=device,
    )

    # checkpoint mới
    if isinstance(checkpoint, dict):

        if "model_state" in checkpoint:
            state_dict = checkpoint["model_state"]

        elif "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]

        elif "model" in checkpoint:
            state_dict = checkpoint["model"]

        else:
            state_dict = checkpoint

    else:
        state_dict = checkpoint

    model.load_state_dict(state_dict)

    model.eval()

    print("[✓] Model loaded")

    return model

# ══════════════════════════════════════════════════════════
# DRAW
# ══════════════════════════════════════════════════════════

def draw(frame, faces, results, labels):

    for i, (x, y, w, h) in enumerate(faces):

        if i not in results:
            continue

        emotion, conf, probs = results[i]

        idx = labels.index(emotion)

        color = COLORS.get(idx, (255, 255, 255))

        cv2.rectangle(
            frame,
            (x, y),
            (x + w, y + h),
            color,
            2,
        )

        text = f"{emotion} {conf*100:.0f}%"

        cv2.putText(
            frame,
            text,
            (x, y - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            color,
            2,
            cv2.LINE_AA,
        )

# ══════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════

def run(args):

    labels = fetch_model(
        args.server,
        args.model,
    )

    model = load_model(
        args.model,
        len(labels),
    )

    detector = cv2.CascadeClassifier(
        cv2.data.haarcascades +
        "haarcascade_frontalface_default.xml"
    )

    cap = cv2.VideoCapture(args.camera)

    if not cap.isOpened():
        print("[✗] Không mở được webcam")
        return

    buffers = {}
    results = {}

    idx = 0
    fps_q = deque(maxlen=30)

    print("\n[►] Running...\n")

    while True:

        t0 = time.perf_counter()

        ok, frame = cap.read()

        if not ok:
            break

        frame = cv2.flip(frame, 1)

        gray = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2GRAY,
        )

        faces = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )

        if idx % INFER_EVERY == 0:

            for fid, (x, y, w, h) in enumerate(faces):

                roi = frame[y:y+h, x:x+w]

                try:

                    tensor = to_tensor(roi)

                    with torch.no_grad():

                        logits = model(tensor)

                        probs = F.softmax(
                            logits,
                            dim=1,
                        )[0].cpu().numpy()

                    if fid not in buffers:
                        buffers[fid] = deque(
                            maxlen=SMOOTH_N
                        )

                    buffers[fid].append(probs)

                    avg = np.mean(
                        list(buffers[fid]),
                        axis=0,
                    )

                    top = int(np.argmax(avg))

                    emotion = labels[top]
                    conf = float(avg[top])

                    results[fid] = (
                        emotion,
                        conf,
                        avg,
                    )

                except Exception as e:
                    print(e)

        draw(frame, faces, results, labels)

        fps_q.append(
            1.0 / max(
                time.perf_counter() - t0,
                1e-6,
            )
        )

        fps = np.mean(fps_q)

        cv2.putText(
            frame,
            f"FPS {fps:.1f}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
        )

        cv2.imshow(
            "Emotion Realtime",
            frame,
        )

        idx += 1

        key = cv2.waitKey(1) & 0xFF

        if key in [27, ord("q"), ord("Q")]:
            break

    cap.release()
    cv2.destroyAllWindows()

# ══════════════════════════════════════════════════════════
# ENTRY
# ══════════════════════════════════════════════════════════

if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--server",
        default=SERVER,
    )

    parser.add_argument(
        "--model",
        default=MODEL_FILE,
    )

    parser.add_argument(
        "--camera",
        type=int,
        default=0,
    )

    args = parser.parse_args()

    run(args)