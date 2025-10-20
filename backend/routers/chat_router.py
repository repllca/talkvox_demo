from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm_service import generate_response
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ 入出力スキーマ定義（後でOpenAPIドキュメントでも役立つ）
class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    response: str

# ✅ エンドポイント
@router.post("/generate", response_model=ChatResponse)
async def generate_chat(request: ChatRequest):
    """LLMにプロンプトを送り、応答を返すエンドポイント"""
    try:
        response_text = await generate_response(request.prompt)
        return ChatResponse(response=response_text)
    except Exception as e:
        logger.exception("Error during LLM generation")  # ← ログに詳細出す
        raise HTTPException(status_code=500, detail="Internal server error")
