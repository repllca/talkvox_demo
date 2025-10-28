# backend/routers/ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import cv2
from services.hand_tracking import detect_hands

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
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
                print("⚠️ フレーム処理中のエラー:", e)
                continue

            # バイナリを画像に変換
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # 手検出
            hands = detect_hands(frame)  # [{'x_min':..., 'y_min':..., 'x_max':..., 'y_max':...}, ...]

            # クライアントに送信
            await websocket.send_json({"hands": hands})

    finally:
        await websocket.close()
        print("🔌 WebSocket 接続終了")
