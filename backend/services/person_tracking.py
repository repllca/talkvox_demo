import torch
import cv2
import numpy as np
from ultralytics import YOLO
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict

device = "cuda" if torch.cuda.is_available() else "cpu"

# YOLOv8nモデルロード
model = YOLO("yolov8n.pt").to(device)

# 過去検出人物の特徴DB
person_db: Dict[int, np.ndarray] = {}
next_person_id = 1

def extract_feature(frame: np.ndarray, box: List[int]) -> np.ndarray:
    x1, y1, x2, y2 = box
    crop = frame[y1:y2, x1:x2]
    crop = cv2.resize(crop, (64, 128))
    hist = cv2.calcHist([crop], [0,1,2], None, [8,8,8], [0,256]*3)
    hist = cv2.normalize(hist, hist).flatten()
    return hist

def identify_person(feature: np.ndarray, threshold: float = 0.7) -> int:
    global next_person_id

    if not person_db:
        person_db[next_person_id] = feature
        next_person_id += 1
        return next_person_id - 1, True  # 新規登録

    sims = {pid: cosine_similarity(feature.reshape(1,-1), f.reshape(1,-1))[0,0]
            for pid, f in person_db.items()}
    best_pid, best_sim = max(sims.items(), key=lambda x: x[1])

    if best_sim >= threshold:
        return best_pid, False
    else:
        person_db[next_person_id] = feature
        next_person_id += 1
        return next_person_id - 1, True

def detect_persons(frame: np.ndarray) -> List[Dict]:
    results = model(frame)
    persons = []

    for r in results:
        for box, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
            if int(cls) != 0 or conf < 0.6:
                continue

            x1, y1, x2, y2 = map(int, box)
            feature = extract_feature(frame, [x1, y1, x2, y2])
            pid, is_new = identify_person(feature)

            persons.append({
                "id": pid,
                "is_new": is_new,
                "x_min": x1 / frame.shape[1],
                "y_min": y1 / frame.shape[0],
                "x_max": x2 / frame.shape[1],
                "y_max": y2 / frame.shape[0],
                "conf": float(conf),
            })
    return persons
