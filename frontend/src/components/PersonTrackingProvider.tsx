// components/PersonTrackingProvider.tsx
import React, { useEffect, useRef, useState } from "react";

export default function PersonTrackingProvider() {
  const [isRunning, setIsRunning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        console.log("📷 カメラ起動");
      } catch (err) {
        console.error("カメラ起動エラー:", err);
      }
    };

    // カメラ起動
    initCamera();

    // WebSocket 接続
    wsRef.current = new WebSocket("ws://localhost:8000/ws_person");
    wsRef.current.onopen = () => console.log("✅ Person WS 接続");
    wsRef.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      // 👇 ここで状態をどこかに保存しておく（ReduxやContextなど）
      console.log("👤 検出:", data);
    };
    wsRef.current.onclose = () => console.log("🔌 Person WS 切断");

    setIsRunning(true);

    return () => {
      // 終了時のクリーンアップ
      if (wsRef.current) wsRef.current.close();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <>
      {/* 👇 invisible camera feed */}
      <video ref={videoRef} style={{ display: "none" }} />
      {/* 状態表示などが必要なら */}
      <div style={{ position: "fixed", bottom: 10, right: 10, fontSize: 12, color: "gray" }}>
        {isRunning ? "👁 Person Tracking Running..." : "⏸ 停止中"}
      </div>
    </>
  );
}
