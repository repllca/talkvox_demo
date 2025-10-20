import os
import google.generativeai as genai

# APIキー設定
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_response(prompt: str) -> str:
    """
    Gemini（Google Generative AI）に問い合わせてレスポンスを返す
    """
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Geminiの呼び出しは同期なので、FastAPIで使う場合はスレッド実行する
    from asyncio import to_thread
    response = await to_thread(model.generate_content, prompt)

    return response.text.strip()
