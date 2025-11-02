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
  const [speech, setSpeech] = useState<string | null>(null);

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

        if (visiblePersons.length > 0 && !lastPersonDetectedRef.current) {
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
  // カメラ起動（右パネル）
  // ===============================
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

  // ===============================
  // Pose WebSocket
  // ===============================
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/pose");
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ Pose WS 接続成功");
    ws.onclose = () => console.log("🔌 Pose WS 接続終了");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && Array.isArray(data.poses)) {
          const action = data.poses[0]?.action;
          const prevAction = lastPoseRef.current;
          const justRaised =
            (action === "left_hand_up" ||
              action === "right_hand_up" ||
              action === "both_hands_up") &&
            prevAction === "not_raising_hand";

          if (justRaised) {
            handleBotAutoMessage("なんで手を上げているんですか？");
          }
          lastPoseRef.current = action || "not_raising_hand";
        }
      } catch (e) {
        console.error("❌ JSON解析エラー:", e);
      }
    };

    return () => ws.close();
  }, []);

  // ===============================
  // Bot自動メッセージ（人物検出・手上げ）
  // ===============================
  const handleBotAutoMessage = (text: string) => {
    const character = charactersData[selected];
    const avatar = character.images[expression];

    setMessages((prev) => [...prev, { sender: "bot", type: "normal", text, avatar }]);

    setSpeech(text);
    setTimeout(() => setSpeech(null), 4000);

    fetch("http://localhost:8000/voice/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, character: character.speakerId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.audio_path) {
          const audio = new Audio(`http://localhost:8000/${data.audio_path}`);
          audio.play().catch((e) => console.warn("音声再生失敗:", e));
        }
      })
      .catch((err) => console.error("音声生成エラー:", err));
  };

  // ===============================
  // 通常チャット送信
  // ===============================
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const character = charactersData[selected];
      const prompt = `あなたの性格は「${character.personality}」です。\n\nユーザー: ${input}`;

      const chatRes = await fetch("http://localhost:8000/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const chatData = await chatRes.json();
      const botReply = chatData.response || "……（応答なし）";
      const botEmotion = chatData.emotion || "normal";

      setMessages((prev) => [...prev, { sender: "bot", type: "normal", text: botReply }]);
      setExpression(botEmotion);

      setSpeech(botReply);
      setTimeout(() => setSpeech(null), 4000);

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

  return (
    <div className={styles.layout}>
      {/* 左：AIキャラクター */}
      <div className={styles.leftPanel}>
        <AIPersona {...charactersData[selected]} expression={expression} speech={speech} />
        <CharacterSelector
          characters={Object.keys(charactersData)}
          selected={selected}
          onSelect={(name) => setSelected(name as keyof typeof charactersData)}
        />
      </div>

      {/* 中央：チャット欄 */}
      <div className={styles.centerPanel}>
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>
        <div className={styles.inputArea}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="メッセージを入力..."
            className={styles.inputBox}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`${styles.sendButton} ${loading ? styles.disabled : ""}`}
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </div>
      </div>

      {/* 右：ユーザカメラ */}
      <div className={styles.rightPanel}>
        <video ref={videoRef} autoPlay playsInline muted className={styles.cameraFeed} />
      </div>
    </div>
  );
}
