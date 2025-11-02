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

    try:
        while True:
            frame_count += 1
            print(f"\n🟦 === フレーム {frame_count} 受信待ち ===")

            # --- フロントからJPEGバイナリ受信 ---
            try:
                data = await websocket.receive_bytes()
                print(f"📥 {len(data)} bytes 受信")
            except Exception as e:
                print(f"❌ 受信エラー: {e}")
                break

            # --- OpenCVでデコード ---
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                print("⚠️ フレームが None（デコード失敗）")
                continue

            # --- YOLO pose 推論 ---
            try:
                t0 = time.time()
                results = model.predict(frame, verbose=False)
                poses = results[0].keypoints.xy
                elapsed = time.time() - t0
                print(f"🧠 推論完了 ({elapsed:.2f}s) / {len(poses)}人検出")
            except Exception as e:
                print(f"❌ YOLO推論エラー: {e}")
                continue

            # --- 結果処理 ---
            response = []
            for keypoints_tensor in poses:
                keypoints = keypoints_tensor.tolist()

                # 肩と手首の位置を利用して「手が上がっている」か判定
                left_shoulder = keypoints[5]
                right_shoulder = keypoints[6]
                left_wrist = keypoints[9]
                right_wrist = keypoints[10]

                def is_hand_up(wrist, shoulder):
                    # yが小さい（上）ほど上げている
                    return wrist[1] < shoulder[1] - 20 and abs(wrist[0] - shoulder[0]) < 150

                left_up = is_hand_up(left_wrist, left_shoulder)
                right_up = is_hand_up(right_wrist, right_shoulder)

                if left_up and right_up:
                    action = "both_hands_up"
                elif left_up:
                    action = "left_hand_up"
                elif right_up:
                    action = "right_hand_up"
                else:
                    action = "not_raising_hand"

                response.append({
                    "action": action,
                    "timestamp": time.strftime("%H:%M:%S"),
                })

            # --- フロントへ送信 ---
            try:
                await websocket.send_json({"poses": response})
                print(f"📤 送信完了 ({len(response)}件): {response}")
            except Exception as e:
                print(f"❌ 送信エラー: {e}")
                break

    except Exception as e:
        print("💥 全体エラー:", e)
    finally:
        print("🔌 WebSocket切断")
        await websocket.close()
