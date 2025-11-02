from fastapi import APIRouter, WebSocket
import cv2
import numpy as np
from ultralytics import YOLO
import time

router = APIRouter()
model = YOLO("yolov8n-pose.pt")  # 一度だけロードして使い回し

@router.websocket("/ws/pose")
async def pose_ws(websocket: WebSocket):
    print("🚀 WebSocketハンドラ起動")
    await websocket.accept()
    print("✅ Pose WebSocket 接続")

    frame_count = 0
    hand_up_start = None       # ⏱️ 手を上げた時刻
    hand_up_triggered = False  # ✅ 一度トリガーしたかどうか

    try:
        while True:
            frame_count += 1
            print(f"\n🟦 === フレーム {frame_count} 受信待ち ===")

            # --- フロントからJPEGバイナリ受信 ---
            try:
                data = await websocket.receive_bytes()
            except Exception as e:
                print(f"❌ 受信エラー: {e}")
                break

            # --- OpenCVでデコード ---
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # --- YOLO pose 推論 ---
            try:
                results = model.predict(frame, verbose=False)
                poses = results[0].keypoints.xy
            except Exception as e:
                print(f"❌ YOLO推論エラー: {e}")
                continue

            # --- 結果処理 ---
            response = []
            any_hand_up = False

            for keypoints_tensor in poses:
                keypoints = keypoints_tensor.tolist()

                left_shoulder = keypoints[5]
                right_shoulder = keypoints[6]
                left_wrist = keypoints[9]
                right_wrist = keypoints[10]

                def is_hand_up(wrist, shoulder):
                    return wrist[1] < shoulder[1] - 20 and abs(wrist[0] - shoulder[0]) < 150

                left_up = is_hand_up(left_wrist, left_shoulder)
                right_up = is_hand_up(right_wrist, right_shoulder)

                if left_up and right_up:
                    action = "both_hands_up"
                    any_hand_up = True
                elif left_up:
                    action = "left_hand_up"
                    any_hand_up = True
                elif right_up:
                    action = "right_hand_up"
                    any_hand_up = True
                else:
                    action = "not_raising_hand"

                response.append({
                    "action": action,
                    "timestamp": time.strftime("%H:%M:%S"),
                })

            # --- 継続時間の確認 ---
            now = time.time()
            if any_hand_up:
                if hand_up_start is None:
                    hand_up_start = now
                    print("🕒 手を上げ始めました")
                else:
                    elapsed = now - hand_up_start
                    if elapsed > 1 and not hand_up_triggered:
                        # ✅ 4秒以上経過したらトリガー発火
                        msg = "手を上げている人、何か質問はありますか？"
                        await websocket.send_json({"poses": response, "message": msg})
                        print(f"📢 トリガー発火: {msg}")
                        hand_up_triggered = True
            else:
                # 🙌 手を下ろしたらリセット
                hand_up_start = None
                hand_up_triggered = False

            # --- 通常の結果送信 ---
            if not hand_up_triggered:
                await websocket.send_json({"poses": response})

    except Exception as e:
        print("💥 全体エラー:", e)
    finally:
        print("🔌 WebSocket切断")
        await websocket.close()
