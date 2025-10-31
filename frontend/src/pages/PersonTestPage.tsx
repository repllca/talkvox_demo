import { useEffect, useRef, useState } from "react";

interface PersonBox {
  id: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  conf: number;
  sim: number;
  status: "pending" | "confirmed";
}

export default function PersonTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [persons, setPersons] = useState<PersonBox[]>([]);

  // 1️⃣ カメラ起動
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("カメラ起動エラー:", err));
  }, []);

  // 2️⃣ WebSocket接続
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws_person");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS接続成功");
    ws.onclose = () => console.log("🔌 WS切断");
    ws.onerror = (err) => console.error("⚠️ WSエラー", err);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.persons) {
          setPersons(data.persons);
        }
      } catch (e) {
        console.error("⚠️ WSメッセージ解析エラー:", e);
      }
    };

    return () => ws.close();
  }, []);

  // 3️⃣ 定期的にフレーム送信
  useEffect(() => {
    const sendFrame = () => {
      const ws = wsRef.current;
      const video = videoRef.current;
      if (!ws || !video || ws.readyState !== WebSocket.OPEN) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) blob.arrayBuffer().then((buffer) => ws.send(buffer));
      }, "image/jpeg");
    };

    const interval = setInterval(sendFrame, 200);
    return () => clearInterval(interval);
  }, []);

  // 4️⃣ Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    persons.forEach((p) => {
      const x = p.x_min * canvas.width;
      const y = p.y_min * canvas.height;
      const w = (p.x_max - p.x_min) * canvas.width;
      const h = (p.y_max - p.y_min) * canvas.height;

      // 枠線
      ctx.strokeStyle = p.status === "confirmed" ? "red" : "yellow";
      ctx.lineWidth = p.status === "confirmed" ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      // テキスト
      ctx.font = "14px Arial";
      ctx.fillStyle = p.status === "confirmed" ? "red" : "yellow";
      const label = `ID:${p.id} conf:${p.conf.toFixed(2)} sim:${p.sim.toFixed(2)} ${p.status}`;
      ctx.fillText(label, x + 5, y - 5);
    });
  }, [persons]);

  return (
    <div className="relative w-[640px] h-[480px] bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full rounded-lg shadow"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
      />
    </div>
  );
}
