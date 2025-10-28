from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging
from services.voice_service import generate_voice

router = APIRouter()
logger = logging.getLogger(__name__)

class VoiceRequest(BaseModel):
    text: str
    character: int = 1  # VOICEVOXのspeaker ID

class VoiceResponse(BaseModel):
    audio_path: str

@router.post("/generate", response_model=VoiceResponse)
async def generate_voice_endpoint(request: VoiceRequest):
    """テキストから音声を生成するエンドポイント"""
    try:
        audio_path = await generate_voice(request.text, request.character)
        return VoiceResponse(audio_path=audio_path)
    except Exception as e:
        logger.exception("Error during voice generation")
        raise HTTPException(status_code=500, detail=str(e))
