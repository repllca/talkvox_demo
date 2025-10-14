from fastapi import FastAPI
import requests
import os

app = FastAPI(title="TalkVox Backend")

VOICEVOX_URL = os.getenv("VOICEVOX_URL", "http://voicevox:50021")

@app.get("/speakers")
def get_speakers():
    """Voicevoxの話者一覧を取得"""
    r = requests.get(f"{VOICEVOX_URL}/speakers")
    return r.json()

@app.get("/speak")
def speak(text: str = "こんにちは", speaker: int = 1):
    """音声生成エンドポイント"""
    # 1. 音声クエリ作成
    query = requests.post(f"{VOICEVOX_URL}/audio_query", params={"text": text, "speaker": speaker})
    # 2. 音声合成
    audio = requests.post(f"{VOICEVOX_URL}/synthesis", params={"speaker": speaker}, data=query.json())
    with open("out.wav", "wb") as f:
        f.write(audio.content)
    return {"status": "ok", "text": text, "speaker": speaker}
