# ============================================================
# Stage 1: Build (Node環境)
# ============================================================
FROM node:20-slim AS builder

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# ============================================================
# Stage 2: Run (Nginx)
# ============================================================
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
