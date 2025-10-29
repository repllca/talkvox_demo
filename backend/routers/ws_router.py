from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import cv2

from services.hand_tracking import detect_hands
from services.person_detection import detect_persons

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocketで映像を受け取り、手・人物の位置情報を返す"""
    await websocket.accept()
    print("✅ WebSocket 接続開始")

    try:
        while True:
            try:
                data = await websocket.receive_bytes()
            except WebSocketDisconnect:
                print("🔌 クライアント切断")
                break
            except Exception as e:
                print("⚠️ フレーム受信エラー:", e)
                continue

            # --- フレーム復元 ---
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # --- 手の検出 ---
            hands = detect_hands(frame)

            # --- 人物検出（YOLO）---
            persons = detect_persons(frame)

            # --- 結果送信 ---
            await websocket.send_json({
                "hands": hands,
                "persons": persons
            })

    finally:
        await websocket.close()
        print("🔌 WebSocket 接続終了")
