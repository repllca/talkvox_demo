# backend/services/person_tracking.py
import time
from collections import defaultdict, deque
from typing import List, Dict, Tuple, Any, Optional

import numpy as np
import cv2
from sklearn.metrics.pairwise import cosine_similarity
import logging

# try/except around heavy imports so errors are clearer at startup
try:
    from ultralytics import YOLO
    import torch
except Exception as e:
    YOLO = None  # type: ignore
    torch = None  # type: ignore
    logging.warning("ultralytics / torch import failed at module import: %s", e)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# -------------------------
# Configurable parameters
# -------------------------
YOLO_WEIGHTS = "yolov8n.pt"  # 適宜変更
CONF_THRESHOLD = 0.5         # YOLO の信頼度閾値（検出採用）
SIM_THRESHOLD = 0.75         # 類似度閾値（再識別）
KEEP_SECONDS = 10            # 確定に必要な継続秒数
FPS_EST = 5                  # 想定するサンプルレート（tracker 履歴数 = KEEP_SECONDS * FPS_EST）
FEATURE_SIZE = (64, 128)     # 切り出しリサイズサイズ（幅, 高さ）

# -------------------------
# Model lazy loader
# -------------------------
_model = None
_device = "cpu"


def _ensure_model_loaded():
    global _model, _device
    if _model is not None:
        return
    if YOLO is None:
        raise RuntimeError("ultralytics YOLO is not available. Install ultralytics and torch.")
    # device
    _device = "cuda" if torch is not None and torch.cuda.is_available() else "cpu"
    logger.info("Loading YOLO model '%s' on %s ...", YOLO_WEIGHTS, _device)
    try:
        _model = YOLO(YOLO_WEIGHTS)
        if hasattr(_model, "to"):
            _model.to(_device)
        logger.info("YOLO loaded.")
    except Exception as e:
        logger.exception("Failed to load YOLO model: %s", e)
        raise

# -------------------------
# Feature DB and utilities
# -------------------------
_person_db: Dict[int, np.ndarray] = {}  # id -> feature vector
_next_person_id = 1


def _extract_feature(frame: np.ndarray, box: Tuple[int, int, int, int]) -> np.ndarray:
    """
    指定矩形領域から単純な色ヒストグラム特徴量を作る。
    戻り値は正規化された 1D numpy array。
    """
    x1, y1, x2, y2 = box
    h, w = frame.shape[:2]
    # bounds safety
    x1 = max(0, min(w - 1, int(x1)))
    x2 = max(0, min(w, int(x2)))
    y1 = max(0, min(h - 1, int(y1)))
    y2 = max(0, min(h, int(y2)))
    if x2 <= x1 or y2 <= y1:
        # fallback: small area -> use whole frame
        crop = cv2.resize(frame, FEATURE_SIZE)
    else:
        crop = frame[y1:y2, x1:x2]
        crop = cv2.resize(crop, FEATURE_SIZE)

    # BGR histogram 8x8x8 -> flatten
    hist = cv2.calcHist([crop], [0, 1, 2], None, [8, 8, 8], [0, 256] * 3)
    hist = cv2.normalize(hist, hist).flatten()
    return hist.astype(np.float32)


def _identify_person(feature: np.ndarray, threshold: float = SIM_THRESHOLD) -> Tuple[int, float]:
    """
    現在の DB と照合して person id を返す。
    新規なら新しい id を作成して DB に追加する。
    戻り値: (id, similarity)
    """
    global _next_person_id
    if len(_person_db) == 0:
        pid = _next_person_id
        _person_db[pid] = feature
        _next_person_id += 1
        logger.debug("New person assigned id=%d (initial)", pid)
        return pid, 1.0

    # compute cosine similarities
    sims = {}
    for pid, f in _person_db.items():
        try:
            sim = float(cosine_similarity(feature.reshape(1, -1), f.reshape(1, -1))[0, 0])
        except Exception:
            sim = 0.0
        sims[pid] = sim

    # pick best
    best_pid = max(sims.items(), key=lambda x: x[1])[0]
    best_sim = sims[best_pid]

    if best_sim >= threshold:
        # update DB: optionally update running average to adapt (here straightforward replace or moving average)
        # simple update: running average (decay)
        _person_db[best_pid] = (_person_db[best_pid] * 0.7 + feature * 0.3)
        return best_pid, best_sim
    else:
        # new person
        pid = _next_person_id
        _person_db[pid] = feature
        _next_person_id += 1
        logger.debug("New person assigned id=%d (sim=%.3f)", pid, best_sim)
        return pid, best_sim

# -------------------------
# Tracker class
# -------------------------
class PersonTracker:
    """
    各 person id ごとに短期履歴を保持し、「pending -> confirmed」に昇格するロジックを提供する。
    - keep_seconds: 何秒分の履歴をためて判断するか
    - min_conf, min_sim: その間の平均 conf/sim がこれらを超えれば confirmed
    - fps: 1秒あたりの期待更新頻度（履歴長 = keep_seconds * fps）
    """

    def __init__(self, keep_seconds: int = KEEP_SECONDS, min_conf: float = 0.6, min_sim: float = SIM_THRESHOLD, fps: int = FPS_EST):
        self.keep_seconds = keep_seconds
        self.min_conf = min_conf
        self.min_sim = min_sim
        self.fps = fps
        self.maxlen = max(1, int(self.keep_seconds * self.fps))

        # tracks: pid -> dict { history: deque[detection], last_seen: float, confirmed: bool, first_seen_ts: float }
        self.tracks: Dict[int, Dict[str, Any]] = defaultdict(lambda: {
            "history": deque(maxlen=self.maxlen),
            "last_seen": 0.0,
            "confirmed": False,
            "first_seen_ts": None,
        })

    def update(self, detections: List[Dict[str, Any]]) -> None:
        """
        detections: list of dict each:
          {
            "id": int,
            "box": [x1,y1,x2,y2] (pixel coords),
            "conf": float,
            "sim": float,
            "frame_w": int,
            "frame_h": int
          }
        この関数は tracks を更新し、confirmed 判定を行う。
        """
        now = time.time()

        # update existing or create
        for det in detections:
            pid = det["id"]
            rec = self.tracks[pid]
            rec["history"].append(det)
            rec["last_seen"] = now
            if rec["first_seen_ts"] is None:
                rec["first_seen_ts"] = now

            # if not confirmed, check whether history is long enough and averages pass thresholds
            if not rec["confirmed"] and len(rec["history"]) >= self.maxlen:
                hist = list(rec["history"])
                avg_conf = sum(d["conf"] for d in hist) / len(hist)
                avg_sim = sum(d["sim"] for d in hist) / len(hist)
                if avg_conf >= self.min_conf and avg_sim >= self.min_sim:
                    rec["confirmed"] = True
                    logger.info("Person %d confirmed (avg_conf=%.3f avg_sim=%.3f)", pid, avg_conf, avg_sim)

        # cleanup: remove tracks not seen for a while (keep margin = 1.5 * keep_seconds)
        inactive_threshold = now - (self.keep_seconds * 1.5)
        remove = [pid for pid, rec in self.tracks.items() if rec["last_seen"] < inactive_threshold]
        for pid in remove:
            logger.info("Removing inactive track pid=%d", pid)
            del self.tracks[pid]

    def get_tracked_persons(self) -> List[Dict[str, Any]]:
        """
        現在トラッキングされているすべての person の最新情報を返す
        最新の履歴要素を基に normalized coords へ変換し status を付与する
        """
        out = []
        for pid, rec in self.tracks.items():
            hist = rec["history"]
            if not hist:
                continue
            latest = hist[-1]
            x1, y1, x2, y2 = latest["box"]
            frame_w = latest.get("frame_w", 1)
            frame_h = latest.get("frame_h", 1)
            # normalize (0..1)
            # guard division
            if frame_w <= 0 or frame_h <= 0:
                continue
            x_min = float(x1) / frame_w
            y_min = float(y1) / frame_h
            x_max = float(x2) / frame_w
            y_max = float(y2) / frame_h

            out.append({
                "id": pid,
                "x_min": x_min,
                "y_min": y_min,
                "x_max": x_max,
                "y_max": y_max,
                "conf": float(latest.get("conf", 0.0)),
                "sim": float(latest.get("sim", 0.0)),
                "status": "confirmed" if rec["confirmed"] else "pending",
                "last_seen": rec["last_seen"],
            })
        return out

    def get_confirmed_persons(self) -> List[Dict[str, Any]]:
        return [p for p in self.get_tracked_persons() if p["status"] == "confirmed"]

# create a global tracker instance
_tracker = PersonTracker(keep_seconds=KEEP_SECONDS, min_conf=0.6, min_sim=SIM_THRESHOLD, fps=FPS_EST)

# -------------------------
# Main detection function
# -------------------------
def detect_persons(frame: np.ndarray,
                   conf_thresh: float = CONF_THRESHOLD,
                   sim_thresh: float = SIM_THRESHOLD) -> List[Dict[str, Any]]:
    """
    frame: BGR numpy array (H, W, 3)
    戻り値: list of persons (normalized coordinates) like:
      {
        "id": int,
        "x_min": 0..1,
        "y_min": 0..1,
        "x_max": 0..1,
        "y_max": 0..1,
        "conf": float,
        "sim": float,
        "status": "pending"|"confirmed",
        "last_seen": timestamp
      }

    この関数は内部で tracker.update() を呼び、トラッキング情報を更新します。
    """
    _ensure_model_loaded()

    h, w = frame.shape[:2]
    if h == 0 or w == 0:
        return []

    results = _model(frame)

    # results may be a list or a Results object; normalize to iterable of Results
    results_iter = results if isinstance(results, (list, tuple)) else [results]

    # accumulate detections for this frame
    detections_for_tracker: List[Dict[str, Any]] = []

    for res in results_iter:
        # `res.boxes.xyxy`, `res.boxes.cls`, `res.boxes.conf` expected
        boxes = None
        classes = None
        confs = None
        try:
            # ultralytics Results API: boxes.xyxy, boxes.cls, boxes.conf
            boxes = res.boxes.xyxy.cpu().numpy()
            classes = res.boxes.cls.cpu().numpy()
            confs = res.boxes.conf.cpu().numpy()
        except Exception:
            # alternative shapes: some versions expose as lists
            try:
                boxes = np.array(res.boxes.xyxy)
                classes = np.array(res.boxes.cls)
                confs = np.array(res.boxes.conf)
            except Exception as e:
                logger.exception("Unexpected results structure from YOLO: %s", e)
                continue

        if boxes is None or classes is None or confs is None:
            continue

        for box, cls, conf in zip(boxes, classes, confs):
            try:
                cls_i = int(cls)
            except Exception:
                cls_i = int(np.round(float(cls)))

            if cls_i != 0:
                # person class id expected to be 0
                continue
            if float(conf) < conf_thresh:
                continue

            x1, y1, x2, y2 = map(int, box)
            # extract feature and identify
            feat = _extract_feature(frame, (x1, y1, x2, y2))
            pid, sim = _identify_person(feat, threshold=sim_thresh)

            # Only consider if sim >= some low floor (we still allow new people)
            # We keep all detections that pass conf_thresh. Tracker later uses history to confirm.
            detections_for_tracker.append({
                "id": pid,
                "box": [x1, y1, x2, y2],
                "conf": float(conf),
                "sim": float(sim),
                "frame_w": w,
                "frame_h": h,
            })

    # update tracker with detections
    if detections_for_tracker:
        _tracker.update(detections_for_tracker)
    else:
        # still run cleanup of old tracks so inactive ones removed
        _tracker.update([])

    # build output from tracker (includes pending + confirmed)
    tracked = _tracker.get_tracked_persons()

    # optionally filter out very-low-sim/conf persons before returning (we return both statuses)
    # normalize values already done in tracker.get_tracked_persons()

    # Logging for visibility
    if tracked:
        logger.info("Detected %d tracked persons: %s",
                    len(tracked),
                    ", ".join(f"id={p['id']} status={p['status']} conf={p['conf']:.2f} sim={p['sim']:.2f}" for p in tracked))
    else:
        logger.debug("No tracked persons in current frame")

    return tracked
