# backend/main.py
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from routers.ws_router import router as ws_router
from routers.chat_router import router as chat_router
from routers.voice_router import router as voice_router
from routers.ws_pose_router import router as ws_pose_router
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# --- .env 読み込み ---
load_dotenv()
app = FastAPI()

# ============================================================
# YOLO モデルの事前ダウンロード
# ============================================================
try:
    print("📥 YOLO モデル準備を開始...")
    # download_model.py を同ディレクトリ内で実行
    subprocess.run(["python", "download_model.py"], check=True)
    print("✅ YOLO モデル準備完了")
except Exception as e:
    print("⚠️ YOLO モデルのダウンロードに失敗しましjkuた:", e)

# ============================================================
# FastAPI アプリ定義
# ============================================================
# --- ここを追加 ---
os.makedirs("/tmp/voices", exist_ok=True)

# --- ルーターを追加 ---
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(voice_router, prefix="/voice", tags=["Voice"])
app.include_router(ws_router, tags=["WebSocket"])
app.include_router(ws_pose_router, tags=["Pose"])

app.mount("/voices", StaticFiles(directory="/tmp/voices"), name="voices")
# --- CORS設定 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 実験中は * でOK。公開時はフロントのURLを指定。
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
