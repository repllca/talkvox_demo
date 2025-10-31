import torch
import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict
from sklearn.metrics.pairwise import cosine_similarity
import time

device = "cuda" if torch.cuda.is_available() else "cpu"

# YOLOv8モデルロード
model = YOLO("yolov8n.pt")
model.to(device)

# データベース: id -> {"feature": ndarray, "first_seen": timestamp}
person_db: Dict[int, dict] = {}
next_person_id = 1

def extract_feature(frame: np.ndarray, box: List[int]) -> np.ndarray:
    x1, y1, x2, y2 = box
    crop = frame[y1:y2, x1:x2]
    crop = cv2.resize(crop, (64, 128))
    hist = cv2.calcHist([crop], [0,1,2], None, [8,8,8], [0,256]*3)
    hist = cv2.normalize(hist, hist).flatten()
    return hist

def identify_person(feature: np.ndarray, conf: float = 0.7, sim_thr: float = 0.7) -> dict:
    """
    登録済み判定付きで人物IDを返す
    """
    global next_person_id
    now = time.time()

    if not person_db:
        person_db[next_person_id] = {"feature": feature, "first_seen": now}
        next_person_id += 1
        return {"id": next_person_id - 1, "registered": False}

    sims = {pid: cosine_similarity(feature.reshape(1,-1), p["feature"].reshape(1,-1))[0,0]
            for pid, p in person_db.items()}

    best_pid, best_sim = max(sims.items(), key=lambda x: x[1])

    if best_sim >= sim_thr:
        first_seen = person_db[best_pid]["first_seen"]
        registered = (now - first_seen) >= 10  # 10秒以上で登録済み
        return {"id": best_pid, "registered": registered}
    else:
        person_db[next_person_id] = {"feature": feature, "first_seen": now}
        next_person_id += 1
        return {"id": next_person_id - 1, "registered": False}

def detect_persons(frame: np.ndarray, conf_thr: float = 0.5) -> List[dict]:
    results = model(frame)[0]
    persons = []

    for box, cls, conf in zip(results.boxes.xyxy, results.boxes.cls, results.boxes.conf):
        if int(cls) != 0:  # person
            continue
        if conf < conf_thr:
            continue

        x1, y1, x2, y2 = map(int, box)
        feature = extract_feature(frame, [x1,y1,x2,y2])
        person_info = identify_person(feature)
        persons.append({
            "id": person_info["id"],
            "x_min": x1 / frame.shape[1],
            "y_min": y1 / frame.shape[0],
            "x_max": x2 / frame.shape[1],
            "y_max": y2 / frame.shape[0],
            "conf": float(conf),
            "sim": float(best_sim) if 'best_sim' in locals() else 1.0,
            "registered": person_info["registered"]
        })
    return persons
