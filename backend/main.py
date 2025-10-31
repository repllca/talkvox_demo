from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.ws_router import router as ws_router
from routers.chat_router import router as chat_router
from routers.voice_router import router as voice_router
from routers.ws_pose_router import router as ws_pose_router
from services.person_tracker_daemon import person_tracking_loop
from services.monologue_daemon import monologue_loop
import threading
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Persona Backend")

# --- ルーター登録 ---
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(voice_router, prefix="/voice", tags=["Voice"])
app.include_router(ws_pose_router, prefix="/pose", tags=["Pose"])
app.include_router(ws_router, tags=["Person"])

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- サーバー起動時にスレッド起動 ---
@app.on_event("startup")
def start_background_services():
    threading.Thread(target=person_tracking_loop, daemon=True).start()
    threading.Thread(target=monologue_loop, daemon=True).start()
    print("👁 人物追跡・🧠 独り言スレッド起動完了")

@app.get("/")
async def root():
    return {"status": "running", "message": "AI Persona backend active"}
