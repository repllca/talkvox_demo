import { useEffect, useRef, useState } from "react";

interface PersonBox {
  id: number;
  is_new?: boolean;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  conf: number;
}

export default function PersonTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [persons, setPersons] = useState<PersonBox[]>([]);

  // 音声再生
  const playVoice = (text: string) => {
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ja-JP";
    speechSynthesis.speak(uttr);
  };

  // カメラ起動
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch((err) => console.error("カメラ起動エラー:", err));
  }, []);

  // WebSocket接続
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws_person");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS接続成功");
    ws.onclose = () => console.log("🔌 WS切断");
    ws.onerror = (err) => console.error("⚠️ WSエラー", err);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "update") {
        setPersons(data.persons || []);
      }
      if (data.event === "new_person_detected") {
        playVoice("こんにちは！初めまして！");
      }
    };

    return () => ws.close();
  }, []);

  // 定期的にフレーム送信
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

    const interval = setInterval(sendFrame, 300);
    return () => clearInterval(interval);
  }, []);

  // Canvas描画
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
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.is_new ? "blue" : "red";
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "white";
      ctx.font = "14px sans-serif";
      ctx.fillText(`id:${p.id}`, x + 5, y - 5);
    });
  }, [persons]);

  return (
    <div className="relative w-[640px] h-[480px] border rounded-lg mx-auto mt-10 shadow">
      <video ref={videoRef} autoPlay playsInline className="absolute top-0 left-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
    </div>
  );
}
