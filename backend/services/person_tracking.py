# ============================================================
# Person Tracking (YOLOv8 + CLIP + Adaptive Threshold + Smoothing)
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
# デバイス設定
# ============================================================
device = "cuda" if torch.cuda.is_available() else "cpu"

# ============================================================
# モデルロード
# ============================================================
print("🟡 Loading YOLOv8n...")
yolo_model = YOLO("yolov8n.pt").to(device)

print("🟡 Loading CLIP model...")
clip_model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch16",
    use_safetensors=True,
    torch_dtype=torch.float32,
).to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
clip_model.eval()
print("✅ CLIP loaded successfully")

# ============================================================
# 登録DB（idごとに時系列特徴も保持）
# ============================================================
person_db: Dict[int, dict] = {}
next_person_id = 1

# 類似度履歴（自動しきい値調整用）
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
    return feats.cpu().numpy().flatten()


# ============================================================
# adaptive threshold & smoothing
# ============================================================
def get_adaptive_threshold() -> float:
    """類似度分布の平均値から自動調整"""
    if len(similarity_history) < 5:
        return 0.7  # 初期値
    mean_sim = np.mean(similarity_history[-20:])  # 直近20件の平均
    return float(np.clip(mean_sim + 0.05, 0.65, 0.85))  # 安全範囲


# ============================================================
# identify person
# ============================================================
def identify_person(feature: np.ndarray) -> dict:
    """CLIP特徴から人物IDを特定（安定化バージョン）"""
    global next_person_id

    now = time.time()
    # ---- 類似度しきい値を中央値＋補正に変更 ----
    if len(similarity_history) >= 5:
        thr = np.median(similarity_history[-20:]) + 0.02
    else:
        thr = 0.7
    sim_thr = float(np.clip(thr, 0.65, 0.8))  # ← 上限を0.8に固定

    # ---- 正規化（安定化の鍵） ----
    feature = feature / (np.linalg.norm(feature) + 1e-8)

    # 初回登録
    if not person_db:
        person_db[next_person_id] = {"features": [feature], "first_seen": now}
        next_person_id += 1
        return {"id": next_person_id - 1, "registered": False, "sim": 1.0}

    # ---- 既存ユーザーとの類似度を計算 ----
    sims = {}
    for pid, p in person_db.items():
        avg_feat = np.mean(p["features"], axis=0)
        avg_feat = avg_feat / (np.linalg.norm(avg_feat) + 1e-8)
        sims[pid] = cosine_similarity(feature.reshape(1, -1), avg_feat.reshape(1, -1))[0, 0]

    best_pid, best_sim = max(sims.items(), key=lambda x: x[1])
    similarity_history.append(best_sim)

    # ---- 同一人物として扱う条件 ----
    if best_sim >= sim_thr:
        p = person_db[best_pid]
        # CLIP特徴を正規化して平滑更新
        p["features"].append(feature)
        if len(p["features"]) > 10:
            p["features"].pop(0)
        registered = (now - p["first_seen"]) >= 5.0
        return {"id": best_pid, "registered": registered, "sim": float(best_sim)}

    # ---- 新規人物登録 ----
    person_db[next_person_id] = {"features": [feature], "first_seen": now}
    next_person_id += 1
    return {"id": next_person_id - 1, "registered": False, "sim": float(best_sim)}


# ============================================================
# detect_persons
# ============================================================
def detect_persons(frame: np.ndarray, conf_thr: float = 0.5) -> List[dict]:
    """YOLO + CLIPで人物検出 + adaptive re-ID"""
    frame = cv2.resize(frame, (320, 240))
    results = yolo_model(frame, verbose=False)[0]

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

    return persons
