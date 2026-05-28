from __future__ import annotations

import torch
from torch import nn


class ConvBNAct(nn.Sequential):
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1, groups=1, activation=True):
        padding = kernel_size // 2
        layers = [
            nn.Conv2d(in_channels, out_channels, kernel_size=kernel_size, stride=stride,
                      padding=padding, groups=groups, bias=False),
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
            nn.Linear(channels, hidden), nn.ReLU(inplace=True),
            nn.Linear(hidden, channels), nn.Hardsigmoid(),
        )

    def forward(self, x):
        w = self.pool(x).flatten(1)
        return x * self.fc(w).view(x.size(0), x.size(1), 1, 1)


class InvertedResidual(nn.Module):
    def __init__(self, in_channels, out_channels, expand_ratio=4, kernel_size=3, stride=1, use_se=True):
        super().__init__()
        hidden = in_channels * expand_ratio
        self.use_residual = stride == 1 and in_channels == out_channels
        layers = []
        if expand_ratio != 1:
            layers.append(ConvBNAct(in_channels, hidden, kernel_size=1))
        layers.extend([
            ConvBNAct(hidden, hidden, kernel_size=kernel_size, stride=stride, groups=hidden),
            SEBlock(hidden) if use_se else nn.Identity(),
            ConvBNAct(hidden, out_channels, kernel_size=1, activation=False),
        ])
        self.block = nn.Sequential(*layers)

    def forward(self, x):
        out = self.block(x)
        return out + x if self.use_residual else out


class MiniEmotionNet(nn.Module):
    def __init__(self, num_classes=5, dropout=0.35):
        super().__init__()
        self.stem = ConvBNAct(1, 32, kernel_size=3, stride=2)
        self.stage1 = nn.Sequential(
            InvertedResidual(32, 32, expand_ratio=1, kernel_size=3, stride=1, use_se=True),
            InvertedResidual(32, 48, expand_ratio=4, kernel_size=3, stride=2, use_se=False),
        )
        self.stage2 = nn.Sequential(
            InvertedResidual(48, 64, expand_ratio=4, kernel_size=5, stride=2, use_se=True),
            InvertedResidual(64, 64, expand_ratio=3, kernel_size=5, stride=1, use_se=True),
            InvertedResidual(64, 80, expand_ratio=4, kernel_size=3, stride=1, use_se=False),
        )
        self.stage3 = nn.Sequential(
            InvertedResidual(80, 128, expand_ratio=4, kernel_size=3, stride=2, use_se=False),
            InvertedResidual(128, 128, expand_ratio=3, kernel_size=5, stride=1, use_se=True),
            InvertedResidual(128, 160, expand_ratio=3, kernel_size=5, stride=1, use_se=True),
        )
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(), nn.Linear(160, 192), nn.Hardswish(),
            nn.Dropout(dropout), nn.Linear(192, num_classes),
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.pool(x)
        return self.classifier(x)


MiniEmotionNetV2 = MiniEmotionNet
