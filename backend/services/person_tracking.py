import os
os.environ["TRANSFORMERS_NO_TORCH_LOAD_SAFE_CHECK"] = "1"

import torch
import cv2
import numpy as np
from ultralytics import YOLO
from transformers import CLIPModel, CLIPProcessor
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
import time

# ============================================================
# デバイス設定
# ============================================================
device = "cuda" if torch.cuda.is_available() else "cpu"

# ============================================================
# モデルのロード（YOLO + CLIP）
# ============================================================
print("🟡 Loading YOLOv8n...")
model = YOLO("yolov8n.pt")
model.to(device)

print("🟡 Loading CLIP model...")
# clip_model定義部分
clip_model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch16",
    use_safetensors=True,
    torch_dtype=torch.float16   # ✅ 半精度化
).to(device)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
clip_model.eval()
print("✅ CLIP loaded successfully")

# ============================================================
# 登録データベース
# ============================================================
person_db: Dict[int, dict] = {}
next_person_id = 1


# ============================================================
# CLIP特徴抽出
# ============================================================
def extract_feature(frame: np.ndarray, box: List[int]) -> np.ndarray:
    x1, y1, x2, y2 = box
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return np.zeros(512)

    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

    # CLIP入力形式に変換
    inputs = clip_processor(images=crop_rgb, return_tensors="pt").to(device)
    with torch.no_grad():
        features = clip_model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
    return features.cpu().numpy().flatten()


# ============================================================
# ID判定と登録
# ============================================================
def identify_person(feature: np.ndarray, sim_thr: float = 0.7) -> dict:
    global next_person_id
    now = time.time()

    if not person_db:
        person_db[next_person_id] = {"feature": feature, "first_seen": now}
        next_person_id += 1
        return {"id": next_person_id - 1, "registered": False, "sim": 1.0}

    # 既存ユーザーとの類似度計算（CLIP特徴で比較）
    sims = {
        pid: cosine_similarity(feature.reshape(1, -1), p["feature"].reshape(1, -1))[0, 0]
        for pid, p in person_db.items()
    }
    best_pid, best_sim = max(sims.items(), key=lambda x: x[1])

    if best_sim >= sim_thr:
        first_seen = person_db[best_pid]["first_seen"]
        registered = (now - first_seen) >= 10  # 10秒以上見続けたら登録
        person_db[best_pid]["feature"] = feature
        return {"id": best_pid, "registered": registered, "sim": best_sim}

    # 新規登録
    person_db[next_person_id] = {"feature": feature, "first_seen": now}
    next_person_id += 1
    return {"id": next_person_id - 1, "registered": False, "sim": 0.0}


# ============================================================
# メイン人物検出
# ============================================================
def detect_persons(frame: np.ndarray, conf_thr: float = 0.5) -> List[dict]:
    results = model(frame)[0]
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
