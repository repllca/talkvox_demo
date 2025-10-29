import { useEffect, useRef, useState } from "react";

interface PoseData {
  keypoints: [number, number][];
  action: string;
}

export default function PoseActionPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [poses, setPoses] = useState<PoseData[]>([]);

  // 1️⃣ カメラ起動
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("カメラ起動エラー:", err));
  }, []);

  // 2️⃣ WebSocket 接続
  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/pose/ws/pose");

    wsRef.current.onopen = () => console.log("✅ Pose WS 接続成功");
    wsRef.current.onclose = () => console.log("🔌 Pose WS 接続終了");
    wsRef.current.onerror = (err) => console.error("⚠️ WS エラー", err);

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.poses) {
          setPoses(data.poses);
        }
      } catch (e) {
        console.error("⚠️ JSON解析エラー:", e);
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

  // 4️⃣ Canvas に姿勢描画
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    poses.forEach((pose) => {
      const { keypoints, action } = pose;

      // --- 関節点 ---
      ctx.fillStyle = "lime";
      keypoints.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // --- ラベル ---
      if (keypoints.length > 0) {
        const [x0, y0] = keypoints[0];
        ctx.font = "18px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText(action, x0 + 10, y0 - 10);
      }
    });
  }, [poses]);

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
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg">
        {poses.length > 0 ? (
          <p>行動: {poses[0].action}</p>
        ) : (
          <p>検出中...</p>
        )}
      </div>
    </div>
  );
}
