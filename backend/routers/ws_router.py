from fastapi import APIRouter, WebSocket
import numpy as np, cv2, traceback
from services.person_tracking import detect_persons

router = APIRouter()

@router.websocket("/ws_person")
async def ws_person(ws: WebSocket):
    await ws.accept()
    print("🟢 WebSocket /ws_person 接続開始")
    try:
        while True:
            data = await ws.receive_bytes()
            np_arr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue

            persons = detect_persons(frame)

            # 新規検出者を確認
            new_persons = [p for p in persons if p["is_new"]]
            if new_persons:
                print(f"👋 新しい人を検出: {len(new_persons)}名")
                await ws.send_json({"event": "new_person_detected", "persons": new_persons})

            # 全員の位置情報も送る
            await ws.send_json({"event": "update", "persons": persons})

    except Exception as e:
        print("⚠️ WS通信エラー:", e)
        traceback.print_exc()
    finally:
        print("🔴 /ws_person 切断")
        await ws.close()
