from ultralytics import YOLO
import torch
from ultralytics.nn.tasks import DetectionModel
from ultralytics.nn.modules import Conv, C2f, Bottleneck, SPPF
from torch.nn.modules.container import Sequential
from torch.nn import Conv2d, BatchNorm2d, ReLU

device = "cuda" if torch.cuda.is_available() else "cpu"

print("📥 YOLOv8 モデルのダウンロード開始...")

# YOLOv8が使用する内部クラスをすべて許可
safe_classes = [
    DetectionModel,
    Conv, C2f, Bottleneck, SPPF,  # YOLOの主要モジュール
    Sequential,                   # torchのコンテナ
    Conv2d, BatchNorm2d, ReLU     # torchの基本レイヤー
]

with torch.serialization.safe_globals(safe_classes):
    model = YOLO("yolov8n.pt")  # 存在しなければ自動ダウンロード
    model.to(device)

print("✅ YOLOv8 モデルのダウンロード完了")
