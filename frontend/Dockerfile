# frontend/Dockerfile
FROM node:20-slim

WORKDIR /app

# Yarn と corepack
RUN corepack enable

# 依存関係コピー（先に package.json だけコピーして yarn install するとキャッシュ効く）
COPY package.json yarn.lock ./
RUN yarn install

# アプリコピー
COPY . .

# Vite dev server
CMD ["bash", "-c", "yarn dev --host"]
