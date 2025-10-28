# backend/services/hand_tracking.py
import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands


def detect_hands(frame):
    """
    受け取ったフレームから手を検出し、
    検出領域の座標を返す（JSONで使いやすい形式）
    """
    results_data = []

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        # BGR → RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb_frame)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # 各ランドマークの x, y 座標を取得（正規化座標）
                xs = [lm.x for lm in hand_landmarks.landmark]
                ys = [lm.y for lm in hand_landmarks.landmark]
                x_min, x_max = min(xs), max(xs)
                y_min, y_max = min(ys), max(ys)

                results_data.append({
                    "x_min": float(x_min),
                    "x_max": float(x_max),
                    "y_min": float(y_min),
                    "y_max": float(y_max),
                })

    return results_data
