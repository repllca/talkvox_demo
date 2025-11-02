import { useEffect, useRef, useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage"; import charactersData from "../data/characters.json";

interface PoseData {
  keypoints: [number, number][];
  action: string;
}

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof charactersData>("ソラ");
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState<"normal" | "happy" | "sad">("normal");

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPoseRef = useRef<string>("not_raising_hand");

// 🟢 追加部分だけピックアップ（Home.tsx 内）

const personSocketRef = useRef<WebSocket | null>(null);
const lastPersonDetectedRef = useRef(false);

// ===============================
// 人物トラッキング WebSocket
// ===============================
useEffect(() => {
  console.log("🚀 Person WebSocket 初期化...");
  const ws = new WebSocket("ws://localhost:8000/ws_person");
  personSocketRef.current = ws;

  ws.onopen = () => console.log("✅ Person WS 接続成功");
  ws.onclose = () => console.log("🔌 Person WS 接続終了");
  ws.onerror = (err) => console.error("⚠️ Person WS エラー:", err);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (!data.persons) return;

      const visiblePersons = data.persons.filter(
        (p: any) => p.conf > 0.6 && p.sim > 0.6
      );

      console.log(`📩 ${visiblePersons.length}人検出`);

      // --- 1人でも新しく検出されたら反応 ---
      if (visiblePersons.length > 0 && !lastPersonDetectedRef.current) {
        console.log("🧍 人物検出トリガー！");
        lastPersonDetectedRef.current = true;
        handleBotAutoMessage("あっ、誰か来ましたね！");
      }

      // --- 5秒間誰もいなければリセット ---
      if (visiblePersons.length === 0) {
        lastPersonDetectedRef.current = false;
      }
    } catch (e) {
      console.error("❌ Person JSON解析エラー:", e);
    }
  };

  return () => ws.close();
}, []);

// ===============================
// フレーム送信 (人物検出用)
// ===============================
useEffect(() => {
  const sendFrame = () => {
    const video = videoRef.current;
    const ws = personSocketRef.current;
    if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

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
            console.log("📤 Personフレーム送信:", buffer.byteLength, "bytes");
          });
        }
      },
      "image/jpeg",
      0.7
    );
  };

  const interval = setInterval(sendFrame, 300);
  return () => clearInterval(interval);
}, []);
  // ========================================
  // 1️⃣ カメラ起動（非表示）
  // ========================================
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log("📸 カメラ起動成功");
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
    };

    ws.onclose = () => {
      console.log("🔌 Pose WS 接続終了");
    };

    ws.onerror = (err) => {
      console.error("⚠️ Pose WS エラー:", err);
    };

    ws.onmessage = (event) => {
      console.log("📩 Poseデータ受信:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.poses)) {
          const action = data.poses[0]?.action;
          console.log("🎯 現在のaction:", action);

          const prevAction = lastPoseRef.current;
          const justRaised =
            (action === "left_hand_up" ||
              action === "right_hand_up" ||
              action === "both_hands_up") &&
            prevAction === "not_raising_hand";

          if (justRaised) {
            console.log("🙌 手を上げました！（トリガー検出）");
            handleBotAutoMessage("なんで手を上げているんですか？");
          }

          lastPoseRef.current = action || "not_raising_hand";
        } else {
          console.warn("⚠️ posesが存在しません:", data);
        }
      } catch (e) {
        console.error("❌ JSON解析エラー:", e);
      }
    };

    return () => ws.close();
  }, []);

  // ========================================
  // 3️⃣ 定期的にフレーム送信 (300msごと)
  // ========================================
  useEffect(() => {
    const sendFrame = () => {
      const video = videoRef.current;
      const ws = wsRef.current;

      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

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

    const interval = setInterval(sendFrame, 300);
    return () => clearInterval(interval);
  }, []);

  // ========================================
  // Botが自動で話しかける処理
  // ========================================
  const handleBotAutoMessage = (text: string) => {
    setMessages((prev) => [...prev, { sender: "bot", type: "normal", text }]);
    const character = charactersData[selected];

    fetch("http://localhost:8000/voice/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, character: character.speakerId }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("🔊 音声生成レスポンス:", data);
        if (data.audio_path) {
          const audio = new Audio(`http://localhost:8000/${data.audio_path}`);
          audio.play().catch((e) => console.warn("音声再生失敗:", e));
        }
      })
      .catch((err) => console.error("音声生成エラー:", err));
  };

  // ========================================
  // 通常チャット送信
  // ========================================
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const character = charactersData[selected];
      const personalityPrompt = `あなたの性格は「${character.personality}」です。次のユーザーの発言に応えてください。\n\nユーザー: ${input}`;

      const chatRes = await fetch("http://localhost:8000/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: personalityPrompt }),
      });

      const chatData: { response: string; emotion?: "happy" | "sad" | "normal" } =
        await chatRes.json();
      const botReply = chatData.response || "……（応答なし）";
      const botEmotion = chatData.emotion || "normal";

      setMessages((prev) => [...prev, { sender: "bot", type: "normal", text: botReply }]);
      setExpression(botEmotion);

      // VOICEVOX
      const voiceRes = await fetch("http://localhost:8000/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: botReply, character: character.speakerId }),
      });
      const voiceData = await voiceRes.json();
      if (voiceData.audio_path) {
        const audio = new Audio(`http://localhost:8000/${voiceData.audio_path}`);
        audio.play().catch((e) => console.warn("音声再生失敗:", e));
      }

      setLoading(false);
    } catch (err) {
      console.error("チャットエラー:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "error", text: "エラーが発生しました😢" },
      ]);
      setLoading(false);
    }
  };

  // ========================================
  // 背景変化
  // ========================================
  const bgGradient = {
    normal: "from-blue-100 via-white to-blue-50",
    happy: "from-yellow-100 via-pink-50 to-yellow-50",
    sad: "from-gray-200 via-gray-100 to-gray-300",
  }[expression];

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-between transition-all duration-700 bg-gradient-to-b ${bgGradient} relative overflow-hidden`}
    >
      {/* 非表示カメラ */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* キャラ選択 */}
      <div className="absolute top-4 left-4 z-20">
        <CharacterSelector
          characters={Object.keys(charactersData)}
          selected={selected}
          onSelect={(name) => setSelected(name as keyof typeof charactersData)}
        />
      </div>

      {/* キャラクター */}
      <div className="flex-1 flex items-center justify-center mt-10">
        <AIPersona {...charactersData[selected]} expression={expression} />
      </div>

      {/* チャットUI */}
      <div className="w-full max-w-2xl bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl mb-8 p-6 flex flex-col border border-white/40">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 h-80 px-2">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="メッセージを入力..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`px-5 py-2 rounded-full font-semibold text-white shadow-md transition-all ${
              loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600 active:scale-95"
            }`}
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
