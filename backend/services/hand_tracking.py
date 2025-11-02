import cv2
import mediapipe as mp

# ============================================================
# MediaPipe Hands 初期化（1回だけ）
# ============================================================
mp_hands = mp.solutions.hands
hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# ============================================================
# 手検出関数
# ============================================================
def detect_hands(frame):
    """
    受け取ったフレームから手を検出し、
    各手の領域 (x_min, x_max, y_min, y_max) を返す。
    ピクセル座標も同時に返す。
    """
    results_data = []

    # --- BGR → RGB ---
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # --- 推論 ---
    results = hands_detector.process(rgb_frame)

    h, w, _ = frame.shape  # 元フレームサイズ

    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # 各ランドマークの正規化座標 (0〜1)
            xs = [lm.x for lm in hand_landmarks.landmark]
            ys = [lm.y for lm in hand_landmarks.landmark]

            # 正規化座標
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)

            # ピクセル座標に変換
            px_min = int(x_min * w)
            px_max = int(x_max * w)
            py_min = int(y_min * h)
            py_max = int(y_max * h)

            results_data.append({
                "x_min": float(x_min),
                "x_max": float(x_max),
                "y_min": float(y_min),
                "y_max": float(y_max),
                "px_min": px_min,
                "px_max": px_max,
                "py_min": py_min,
                "py_max": py_max,
            })

    return results_data
