import cv2
import numpy as np
from fastapi import APIRouter, WebSocket
from ultralytics import YOLO
import io

router = APIRouter()
model = YOLO("yolov8n-pose.pt")  # 軽量版姿勢モデル

@router.websocket("/ws/pose")
async def pose_ws(websocket: WebSocket):
    await websocket.accept()
    print("✅ Pose WebSocket 接続")

    try:
        while True:
            # クライアントから画像を受信
            data = await websocket.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            # YOLOv8-Pose 推論
            results = model.predict(frame, verbose=False)
            poses = results[0].keypoints.xy  # (人数, 17, 2)

            response = []

            for person_keypoints in poses:
                keypoints = person_keypoints.tolist()

                # --- 簡易行動分類 (デモ用) ---
                # 手の高さで「手を挙げている」かを判定
                left_wrist = keypoints[9]
                right_wrist = keypoints[10]
                nose = keypoints[0]
                action = "standing"

                if left_wrist[1] < nose[1] or right_wrist[1] < nose[1]:
                    action = "raising_hand"

                response.append({
                    "keypoints": keypoints,
                    "action": action
                })

            await websocket.send_json({"poses": response})

    except Exception as e:
        print("⚠️ エラー:", e)
    finally:
        print("🔌 WebSocket切断")
        await websocket.close()
