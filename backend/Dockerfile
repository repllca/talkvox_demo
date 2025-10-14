
# ============================================================
# Python FastAPI backend
# ============================================================
FROM python:3.10-slim

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係インストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体をコピー
COPY . .

# ポート指定
EXPOSE 8000

# 起動コマンド
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
