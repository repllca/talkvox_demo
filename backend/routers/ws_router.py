# backend/routers/ws_router.py
from fastapi import APIRouter, WebSocket
import numpy as np
import cv2

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """クライアントから受信したフレームを処理するWebSocketエンドポイント"""
    await websocket.accept()
    print("✅ WebSocket 接続開始")

    try:
        while True:
            data = await websocket.receive_bytes()  # バイナリデータ受信
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # TODO: フレームを処理したい場合はここに追加
            # 例: フレームサイズをログ出力
            print("📸 受信フレームサイズ:", frame.shape)

            # クライアントに返信を送りたい場合
            await websocket.send_text("Frame received")

    except Exception as e:
        print("❌ WebSocket 接続エラー:", e)
    finally:
        print("🔌 接続終了")
        await websocket.close()
