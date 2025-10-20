# ============================================================
# Python FastAPI backend with OpenCV
# ============================================================
FROM python:3.10-slim

WORKDIR /app

# OpenCVの依存ライブラリをインストール
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# 依存関係をインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体をコピー
COPY . .

EXPOSE 8000

# FastAPI起動（開発中は --reload 推奨）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
