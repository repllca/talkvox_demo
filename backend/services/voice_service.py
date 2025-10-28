# backend/services/voice_service.py
import os
import aiohttp

TALKVOX_URL = os.getenv("TALKVOX_URL", "http://voicebox:50021")

async def generate_voice(text: str, speaker: int = 1) -> str:
    """
    VoiceVoxエンジンにリクエストして音声を生成する
    """
    async with aiohttp.ClientSession() as session:
        # Step1: 音声合成クエリを作成
        query_payload = {"text": text, "speaker": speaker}
        async with session.post(f"{TALKVOX_URL}/audio_query", params=query_payload) as query_resp:
            if query_resp.status != 200:
                raise RuntimeError(f"audio_query error: {query_resp.status}")
            query = await query_resp.json()

        # Step2: 合成処理
        async with session.post(f"{TALKVOX_URL}/synthesis", params={"speaker": speaker}, json=query) as synth_resp:
            if synth_resp.status != 200:
                raise RuntimeError(f"synthesis error: {synth_resp.status}")

            audio_bytes = await synth_resp.read()

    # WAVファイルとして保存
    output_path = "/app/output.wav"
    with open(output_path, "wb") as f:
        f.write(audio_bytes)

    return output_path
