# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.ws_router import router as ws_router
from routers.chat_router import router as chat_router
from routers.voice_router import router as voice_router
from routers.ws_pose_router import router as ws_pose_router
from dotenv import load_dotenv

# --- .env 読み込み ---
load_dotenv()

app = FastAPI()

# --- ルーターを追加 ---
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(voice_router, prefix="/voice", tags=["Voice"])
app.include_router(ws_router, tags=["WebSocket"])
app.include_router(ws_pose_router, prefix="/pose", tags=["Pose"])
# --- CORS設定 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 実験中は * でOK。公開時はフロントのURLを指定。
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
