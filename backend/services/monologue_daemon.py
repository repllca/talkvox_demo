import time
import requests
from services.person_tracker_daemon import get_current_persons

API_CHAT = "http://localhost:8000/chat/generate"
API_VOICE = "http://localhost:8000/voice/generate"

last_monologue_time = 0
active_ids = set()

def monologue_loop():
    global last_monologue_time, active_ids
    print("🧠 独り言スレッド開始")

    while True:
        persons = get_current_persons()
        now = time.time()

        if persons:
            ids = {p["id"] for p in persons}
            if ids != active_ids and now - last_monologue_time > 5:
                active_ids = ids
                last_monologue_time = now

                prompt = "部屋に人がいる気がする。なんだか嬉しいな。"
                try:
                    res = requests.post(API_CHAT, json={"prompt": prompt})
                    data = res.json()
                    text = data.get("response", "……（無言）")
                    print(f"🗣 独り言: {text}")
                    requests.post(API_VOICE, json={"text": text, "character": 1})
                except Exception as e:
                    print("⚠️ 独り言生成エラー:", e)
        time.sleep(3)
