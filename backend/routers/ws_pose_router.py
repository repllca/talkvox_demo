from fastapi import APIRouter, WebSocket
import cv2
import numpy as np
from ultralytics import YOLO

router = APIRouter()
model = YOLO("yolov8n-pose.pt")

@router.websocket("/ws/pose")
async def pose_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ Pose WebSocket 接続")

    try:
        while True:
            # --- フロントから画像バイナリ受信 ---
            data = await websocket.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            # --- YOLO Pose 推論 ---
            results = model.predict(frame, verbose=False)
            poses = results[0].keypoints.xy  # shape: (人数, 17, 2)

            response = []

            for keypoints_tensor in poses:
                keypoints = keypoints_tensor.tolist()

                # --- 主要点抽出 ---
                left_shoulder = keypoints[5]
                right_shoulder = keypoints[6]
                left_elbow = keypoints[7]
                right_elbow = keypoints[8]
                left_wrist = keypoints[9]
                right_wrist = keypoints[10]

                def is_hand_up(wrist, shoulder):
                    return wrist[1] < shoulder[1] - 20 and abs(wrist[0] - shoulder[0]) < 100

                left_up = is_hand_up(left_wrist, left_shoulder)
                right_up = is_hand_up(right_wrist, right_shoulder)

                # --- 動作判定 ---
                if left_up and right_up:
                    action = "both_hands_up"
                elif left_up:
                    action = "left_hand_up"
                elif right_up:
                    action = "right_hand_up"
                else:
                    action = "not_raising_hand"

                response.append({
                    "keypoints": keypoints,
                    "action": action
                })

            # --- JSONとして送信 ---
            await websocket.send_json({"poses": response})

    except Exception as e:
        print("⚠️ エラー:", e)
    finally:
        print("🔌 WebSocket切断")
        await websocket.close()
