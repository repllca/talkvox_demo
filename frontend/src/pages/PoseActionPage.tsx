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
  const [connected, setConnected] = useState(false);

  // ========================================
  // 1️⃣ カメラ起動
  // ========================================
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("📸 カメラ起動エラー:", err));
  }, []);

  // ========================================
  // 2️⃣ WebSocket 接続
  // ========================================
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/pose");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Pose WS 接続成功");
      setConnected(true);
    };

    ws.onclose = () => {
      console.log("🔌 Pose WS 接続終了");
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error("⚠️ Pose WS エラー:", err);
      setConnected(false);
    };

    ws.onmessage = (event) => {
      console.log("📩 Poseデータ受信:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.poses)) {
          setPoses(data.poses);
        } else {
          console.warn("⚠️ posesが存在しません:", data);
          setPoses([]);
        }
      } catch (e) {
        console.error("❌ JSON解析エラー:", e);
      }
    };

    return () => ws.close();
  }, []);

  // ========================================
  // 3️⃣ 定期的にフレーム送信 (200msごと)
  // ========================================
  useEffect(() => {
    const sendFrame = () => {
      const video = videoRef.current;
      const ws = wsRef.current;

      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return; // サイズ未確定ならスキップ

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              ws.send(buffer);
              console.log("📤 フレーム送信:", buffer.byteLength, "bytes");
            });
          }
        },
        "image/jpeg",
        0.7
      );
    };

    const interval = setInterval(sendFrame, 300); // 少し間隔を長めに
    return () => clearInterval(interval);
  }, []);

  // ========================================
  // 4️⃣ Canvas に姿勢描画
  // ========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    const draw = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      poses.forEach((pose, index) => {
        const { keypoints, action } = pose;

        // --- 骨格点 ---
        ctx.fillStyle = "lime";
        keypoints?.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // --- ラベル ---
        if (keypoints?.length > 0) {
          const [x0, y0] = keypoints[0];
          ctx.font = "18px Arial";
          ctx.fillStyle = "yellow";
          ctx.fillText(`${index + 1}: ${action}`, x0 + 10, y0 - 10);
        }
      });
    };

    draw();
  }, [poses]);

  return (
    <div className="relative w-[640px] h-[480px] bg-black text-white">
      {/* カメラ映像 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute top-0 left-0 w-full h-full rounded-lg shadow"
      />
      {/* 推論描画 */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
      />
      {/* ステータス表示 */}
      <div className="absolute bottom-3 left-3 bg-black/60 px-4 py-2 rounded-lg text-sm">
        <p>
          状態:{" "}
          {connected ? "🟢 接続中" : "🔴 切断中"}　
          {poses.length > 0 ? `行動: ${poses[0].action}` : "検出中..."}
        </p>
      </div>
    </div>
  );
}
