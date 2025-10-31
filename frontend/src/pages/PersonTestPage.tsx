import { useEffect, useRef, useState } from "react";

interface PersonBox {
  id: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  conf: number;
  sim: number;
}

interface TrackedPerson extends PersonBox {
  lastSeen: number;
  active: boolean;
  registered: boolean; // 登録済みか
}

export default function PersonTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [persons, setPersons] = useState<Map<number, TrackedPerson>>(new Map());
  const personsRef = useRef(persons);

  // --- カメラ起動 ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("カメラ起動エラー:", err));
  }, []);

  // --- personsRef 更新 ---
  useEffect(() => {
    personsRef.current = persons;
  }, [persons]);

  // --- WebSocket接続 ---
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws_person");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WS 接続成功");
    ws.onclose = () => console.log("🔌 WS 接続終了");
    ws.onerror = (err) => console.error("⚠️ WS エラー", err);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const now = Date.now();

      setPersons((prev) => {
        const updated = new Map(prev);

        data.persons?.forEach((p: PersonBox) => {
          if (p.conf > 0.6 && p.sim > 0.6) {
            const exist = updated.get(p.id);
            const registered = exist?.registered || false;
            updated.set(p.id, { ...p, lastSeen: now, active: true, registered });
          }
        });

        // 2秒以上見えない場合は active=false
        updated.forEach((p, id) => {
          if (now - p.lastSeen > 2000) {
            updated.set(id, { ...p, active: false });
          }
        });

        return updated;
      });
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  // --- フレーム送信 ---
  useEffect(() => {
    const sendFrame = () => {
      const video = videoRef.current;
      const ws = wsRef.current;
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) blob.arrayBuffer().then((buffer) => ws.send(buffer));
      }, "image/jpeg", 0.7);
    };

    const interval = setInterval(sendFrame, 100);
    return () => clearInterval(interval);
  }, []);

  // --- Canvas描画 ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const video = videoRef.current;
    if (!canvas || !ctx || !video) return;

    let animationFrameId: number;

    const draw = () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      personsRef.current.forEach((p) => {
        const x = p.x_min * canvas.width;
        const y = p.y_min * canvas.height;
        const w = (p.x_max - p.x_min) * canvas.width;
        const h = (p.y_max - p.y_min) * canvas.height;

        ctx.lineWidth = 3;
        ctx.strokeStyle = p.registered ? "blue" : (p.active ? "red" : "rgba(255,0,0,0.3)");
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(x, y - 20, 120, 18);
        ctx.fillStyle = "white";
        ctx.font = "14px sans-serif";
        ctx.fillText(`id:${p.id} Conf:${p.conf.toFixed(2)}`, x + 5, y - 6);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    video.addEventListener("loadeddata", draw);
    return () => {
      video.removeEventListener("loadeddata", draw);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-[640px] h-[480px] border border-gray-300 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}
