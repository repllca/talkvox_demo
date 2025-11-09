# ============================================================
# Person Tracking (YOLOv8 + CLIP + Adaptive Threshold + Smoothing)
# GPU使用状況デバッグ付きバージョン
# ============================================================

import os
os.environ["TRANSFORMERS_NO_TORCH_LOAD_SAFE_CHECK"] = "1"  # 🔐 torch<2.6安全対応
import torch
import cv2
import numpy as np
import time
from ultralytics import YOLO
from transformers import CLIPModel, CLIPProcessor
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict

# ============================================================
# 設定
# ============================================================
DEBUG = True  # ← GPU使用デバッグON
device = "cuda" if torch.cuda.is_available() else "cpu"

def gpu_info(tag: str):
    """GPUデバッグ情報を出力"""
    if torch.cuda.is_available():
        torch.cuda.synchronize()
        mem = torch.cuda.memory_allocated() / (1024 ** 2)
        total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
        print(f"[{tag}] 🟢 CUDA: {torch.cuda.get_device_name(0)} | Mem: {mem:.1f}/{total:.0f} MB")
    else:
        print(f"[{tag}] ⚪ CPUモードで実行中")

# ============================================================
# モデルロード
# ============================================================
print("🟡 Loading YOLOv8n...")
yolo_model = YOLO("yolov8n.pt").to(device)
if DEBUG: gpu_info("YOLO Load")

print("🟡 Loading CLIP model...")
clip_model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch16",
    use_safetensors=True,
    torch_dtype=torch.float32,
).to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
clip_model.eval()
if DEBUG: gpu_info("CLIP Load")
print("✅ Models loaded successfully")

# ============================================================
# データベース初期化
# ============================================================
person_db: Dict[int, dict] = {}
next_person_id = 1
similarity_history: List[float] = []

# ============================================================
# CLIP特徴抽出
# ============================================================
def extract_feature(frame: np.ndarray, box: List[int]) -> np.ndarray:
    x1, y1, x2, y2 = box
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return np.zeros(512)

    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    inputs = clip_processor(images=crop_rgb, return_tensors="pt").to(device)
    with torch.no_grad():
        feats = clip_model.get_image_features(**inputs)
        feats = feats / feats.norm(dim=-1, keepdim=True)
        if DEBUG:
            gpu_info("Feature Extract")
    return feats.cpu().numpy().flatten()

# ============================================================
# adaptive threshold
# ============================================================
def get_adaptive_threshold() -> float:
    if len(similarity_history) < 5:
        return 0.7
    mean_sim = np.mean(similarity_history[-20:])
    return float(np.clip(mean_sim + 0.05, 0.65, 0.85))

# ============================================================
# identify person
# ============================================================
def identify_person(feature: np.ndarray) -> dict:
    global next_person_id
    now = time.time()

    # 閾値を中央値から自動調整
    if len(similarity_history) >= 5:
        thr = np.median(similarity_history[-20:]) + 0.02
    else:
        thr = 0.7
    sim_thr = float(np.clip(thr, 0.65, 0.8))

    # 正規化
    feature = feature / (np.linalg.norm(feature) + 1e-8)

    if not person_db:
        person_db[next_person_id] = {"features": [feature], "first_seen": now}
        next_person_id += 1
        return {"id": next_person_id - 1, "registered": False, "sim": 1.0}

    sims = {}
    for pid, p in person_db.items():
        avg_feat = np.mean(p["features"], axis=0)
        avg_feat = avg_feat / (np.linalg.norm(avg_feat) + 1e-8)
        sims[pid] = cosine_similarity(feature.reshape(1, -1), avg_feat.reshape(1, -1))[0, 0]

    best_pid, best_sim = max(sims.items(), key=lambda x: x[1])
    similarity_history.append(best_sim)

    if best_sim >= sim_thr:
        p = person_db[best_pid]
        p["features"].append(feature)
        if len(p["features"]) > 10:
            p["features"].pop(0)
        registered = (now - p["first_seen"]) >= 5.0
        return {"id": best_pid, "registered": registered, "sim": float(best_sim)}

    person_db[next_person_id] = {"features": [feature], "first_seen": now}
    next_person_id += 1
    return {"id": next_person_id - 1, "registered": False, "sim": float(best_sim)}

# ============================================================
# detect_persons
# ============================================================
def detect_persons(frame: np.ndarray, conf_thr: float = 0.5) -> List[dict]:
    """YOLO + CLIPで人物検出 + adaptive re-ID"""
    start = time.time()
    frame = cv2.resize(frame, (320, 240))
    results = yolo_model(frame, verbose=False)[0]
    if DEBUG: gpu_info("YOLO Inference")

    persons = []
    for box, cls, conf in zip(results.boxes.xyxy, results.boxes.cls, results.boxes.conf):
        if int(cls) != 0 or conf < conf_thr:
            continue

        x1, y1, x2, y2 = map(int, box)
        feature = extract_feature(frame, [x1, y1, x2, y2])
        person_info = identify_person(feature)

        persons.append({
            "id": person_info["id"],
            "x_min": x1 / frame.shape[1],
            "y_min": y1 / frame.shape[0],
            "x_max": x2 / frame.shape[1],
            "y_max": y2 / frame.shape[0],
            "conf": float(conf),
            "sim": float(person_info["sim"]),
            "registered": person_info["registered"],
        })

    end = time.time()
    if DEBUG:
        print(f"[detect_persons] Frame time: {(end - start)*1000:.1f} ms")
        gpu_info("Frame Done")

    return persons
