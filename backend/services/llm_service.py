import os
import google.generativeai as genai

# APIキー設定
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 解答生成を行う


async def generate_response(prompt: str) -> str:
    """
    TalkVoxの解答内容を生成する
    引数のpronptの中にユーザの入力文字が入っている
    """
    model = genai.GenerativeModel("gemini-2.0-flash")
    # geminiの呼び出しは同期なので、fastapiで使う場合はスレッド実行する
    from asyncio import to_thread
    response = await to_thread(model.generate_content, prompt)

    return response.text.strip()
