// frontend/src/pages/HandTestPage.tsx
import { useEffect, useRef, useState } from "react";

interface HandBox {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
}

export default function HandTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [hands, setHands] = useState<HandBox[]>([]);

  // 1️⃣ カメラ起動
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("カメラ起動エラー:", err));
  }, []);

  // 2️⃣ WebSocket 接続
  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws");

    wsRef.current.onopen = () => console.log("✅ WS 接続成功");
    wsRef.current.onclose = () => console.log("🔌 WS 接続終了");
    wsRef.current.onerror = (err) => console.error("⚠️ WS エラー", err);

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setHands(data.hands || []);
      } catch (e) {
        console.error("⚠️ WS メッセージ解析エラー", e);
      }
    };

    return () => wsRef.current?.close();
  }, []);

  // 3️⃣ 定期的にフレーム送信 (200msごと)
  useEffect(() => {
    const sendFrame = () => {
      if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) blob.arrayBuffer().then((buffer) => wsRef.current?.send(buffer));
      }, "image/jpeg");
    };

    const interval = setInterval(sendFrame, 200);
    return () => clearInterval(interval);
  }, []);

  // 4️⃣ Canvas にボックス描画
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    hands.forEach((h) => {
      const x = h.x_min * canvas.width;
      const y = h.y_min * canvas.height;
      const w = (h.x_max - h.x_min) * canvas.width;
      const hgt = (h.y_max - h.y_min) * canvas.height;

      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, hgt);
    });
  }, [hands]);

  return (
<div className="relative w-[640px] h-[480px]">
  <video
    ref={videoRef}
    autoPlay
    playsInline
    className="absolute top-0 left-0 w-full h-full rounded-lg shadow"
  />
  <canvas
    ref={canvasRef}
    className="absolute top-0 left-0 w-full h-full rounded-lg"
  />
</div>
  );
}
