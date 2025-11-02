# ============================================================
# FastAPI + YOLOv8 + CLIP backend (Python 3.10)
# ============================================================
FROM python:3.10-slim

WORKDIR /app

# ============================================================
# 1️⃣ OS依存パッケージ
# ============================================================
RUN apt-get update && apt-get install -y \
  libgl1 \
  libglib2.0-0 \
  libsm6 \
  libxext6 \
  libxrender1 \
  git \
  build-essential \
  && rm -rf /var/lib/apt/lists/*

# ============================================================
# 2️⃣ pip環境
# ============================================================
RUN pip install --no-cache-dir --upgrade pip setuptools wheel Cython

# ============================================================
# 3️⃣ Pythonライブラリ（AI/CV系）
# ============================================================
RUN pip install --no-cache-dir \
  torch==2.5.1 torchvision==0.20.1 torchaudio \
  ultralytics \
  scikit-learn \
  opencv-python-headless \
  transformers \
  facenet-pytorch \
  mediapipe \
  tensorboard

# ============================================================
# 4️⃣ FastAPI関連
# ============================================================
RUN pip install --no-cache-dir \
  fastapi uvicorn websockets aiohttp asyncio python-dotenv packaging pydantic rich

# ============================================================
# 5️⃣ Google Generative AI API (optional)
# ============================================================
RUN pip install --no-cache-dir google-generativeai

#COPY requirements.txt .
# 6️⃣ アプリ本体コピー
# ============================================================
COPY . .

# ============================================================
# 7️⃣ 起動設定
# ============================================================
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
