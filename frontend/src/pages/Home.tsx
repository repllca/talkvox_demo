import { useEffect, useRef, useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";
import charactersData from "../data/characters.json";
import styles from "./Home.module.css";

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

        if (visiblePersons.length > 0 && !lastPersonDetectedRef.current) {
          console.log("🧍 人物検出トリガー！");
          lastPersonDetectedRef.current = true;
          handleBotAutoMessage("あっ、誰か来ましたね！");
        }

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
  // カメラ起動（非表示）
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
  // Pose WebSocket 接続
  // ========================================
useEffect(() => {
  const ws = new WebSocket("ws://localhost:8000/ws/pose");
  wsRef.current = ws;

  ws.onopen = () => console.log("✅ Pose WS 接続成功");
  ws.onclose = () => console.log("🔌 Pose WS 接続終了");
  ws.onerror = (err) => console.error("⚠️ Pose WS エラー:", err);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("📩 Poseデータ受信:", data);

      // 🎯 1️⃣ 手の動作データがある場合
      if (data && Array.isArray(data.poses)) {
        const action = data.poses[0]?.action;
        const prevAction = lastPoseRef.current;

        const justRaised =
          (action === "left_hand_up" ||
            action === "right_hand_up" ||
            action === "both_hands_up") &&
          prevAction === "not_raising_hand";

        if (justRaised) {
          console.log("🙌 手を上げました！（検出）");
        }

        lastPoseRef.current = action || "not_raising_hand";
      }

      // 💬 2️⃣ サーバーからの特別メッセージがある場合（4秒経過）
      if (data.message) {
        console.log("🗣️ サーバーからのメッセージ:", data.message);
        handleBotAutoMessage(data.message);
      }
    } catch (e) {
      console.error("❌ JSON解析エラー:", e);
    }
  };

  return () => ws.close();
}, []);

  // ========================================
  // 定期的にフレーム送信 (300msごと)
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
  const character = charactersData[selected];
  const avatar = character.images[expression];

  // 💬 チャット欄にも表示
  setMessages((prev) => [...prev, { sender: "bot", type: "normal", text, avatar }]);

  // 🗨️ キャラクター横の吹き出し
  setSpeech(text);
  setTimeout(() => setSpeech(null), 4000); // 4秒後に消える

  // 🔊 音声再生
  fetch("http://localhost:8000/voice/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, character: character.speakerId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.audio_path) {
        // data.audio_path: "/tmp/voices/xxx.wav"
      const publicPath = data.audio_path.replace("/tmp", ""); // ✅ "/voices/351ad..." に変換
      const audio = new Audio(`http://localhost:8000${publicPath}`);
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
  // 背景色を表情に応じて変更
  // ========================================
  const bgColor = {
    normal: "#e0f2fe", // 青系
    happy: "#fef3c7", // 黄色
    sad: "#e5e7eb", // グレー
  }[expression];
  
const bottomRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

return (
  <div className={styles.layout} style={{ backgroundColor: bgColor }}>
    {/* 🔹 非表示の送信用カメラ（そのまま） */}

    {/* 🔹 左：AIキャラ＋キャラ選択 */}
    <div className={styles.leftPanel}>
      <AIPersona {...charactersData[selected]} expression={expression} />
      <CharacterSelector
        characters={Object.keys(charactersData)}
        selected={selected}
        onSelect={(name) => setSelected(name as keyof typeof charactersData)}
      />
    </div>

    {/* 🔹 中央：チャットUI */}
    <div className={styles.centerPanel}>
      <div className={styles.messageArea}>
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}

      <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="メッセージを入力..."
          className={styles.input}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className={styles.sendButton}
        >
          {loading ? "送信中..." : "送信"}
        </button>
      </div>
    </div>

    {/* 🔹 右：ユーザ画像 */}
    <div className={styles.rightPanel}>
      <img
        src="/images/user_placeholder.png"
        alt="ユーザー"
        className={styles.userImage}
      />
    </div>

    <video ref={videoRef} autoPlay playsInline muted style={{ display: "hidden" }} />
    {/* 🔹 下：リアルカメラ映像 */}
    <div className={styles.bottomCamera}>
      <video id="cameraView" ref={videoRef} autoPlay playsInline muted style={{ display: "hidden" }} autoPlay playsInline muted className={styles.cameraFeed} />
    </div>
  </div>
);
}
