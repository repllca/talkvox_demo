# backend/routers/ws_router.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import numpy as np
import cv2
import logging

from services.person_tracking import detect_persons

router = APIRouter()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


@router.websocket("/ws_person")
async def ws_person_endpoint(websocket: WebSocket):
    """
    WebSocketで映像フレームを受信し、人物検出結果を返す。
    クライアント(React)はJPEGバイナリを200msごとに送信する想定。
    """
    await websocket.accept()
    logger.info("✅ WebSocket接続開始 /ws_person")

    try:
        while True:
            # JPEG受信
            data = await websocket.receive_bytes()

            # 画像デコード
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            # 検出
            persons = detect_persons(frame)

            # 検出結果送信（バックエンドではバウンディング描画しない）
            await websocket.send_json({"persons": persons})

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket切断")
    except Exception as e:
        logger.exception("❌ WebSocketエラー: %s", e)
        await websocket.close()
