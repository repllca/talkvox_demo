from fastapi import APIRouter, WebSocket
from services.person_tracking import detect_persons
import numpy as np
import cv2
import traceback

router = APIRouter()

@router.websocket("/ws_person")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            try:
                persons_raw = detect_persons(frame)
                await ws.send_json({"persons": persons_raw})
            except Exception as e:
                print("⚠️ detect_personsエラー:", e)
                traceback.print_exc()
    except Exception as e:
        print("⚠️ WS Error:", e)
        traceback.print_exc()
        await ws.close()
