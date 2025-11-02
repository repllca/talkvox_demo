import { useState, useEffect, useRef } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";
import charactersData from "../data/characters.json";

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof charactersData>("ソラ");
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState<"normal" | "happy" | "sad">("normal");
  const poseSocketRef = useRef<WebSocket | null>(null);
  const lastPoseRef = useRef<string>("not_raising_hand"); // 前回のポーズを記録

  // ========================================
  // 手を上げたときの自動反応
  // ========================================
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/pose");
    poseSocketRef.current = ws;

    ws.onopen = () => console.log("🟢 Pose WebSocket 接続");
    ws.onclose = () => console.log("🔌 Pose WebSocket 切断");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.poses || data.poses.length === 0) return;

      const action = data.poses[0].action as string;
      const prevAction = lastPoseRef.current;

      // --- 手を上げた瞬間だけトリガー ---
      const justRaised =
        (action === "left_hand_up" || action === "right_hand_up" || action === "both_hands_up") &&
        prevAction === "not_raising_hand";

      if (justRaised) {
        console.log("🙌 手を上げました！");
        handleBotAutoMessage("なんで手を上げているんですか？");
      }

      lastPoseRef.current = action;
    };

    return () => ws.close();
  }, []);

  // ========================================
  // Botが自動で話しかける処理
  // ========================================
  const handleBotAutoMessage = (text: string) => {
    setMessages((prev) => [...prev, { sender: "bot", type: "normal", text }]);

    // VOICEVOX読み上げ
    const character = charactersData[selected];
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

  // ========================================
  // 通常チャット送信
  // ========================================
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { sender: "bot", type: "thinking", text: "（うーん…どう答えようかな🤔）" },
    ]);

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

      setTimeout(async () => {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== "thinking");
          return [...filtered, { sender: "bot", type: "normal", text: botReply }];
        });

        setExpression(botEmotion);

        // VOICEVOX
        try {
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
        } catch (err) {
          console.error("音声生成エラー:", err);
        }

        setLoading(false);
      }, 1000);
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
  // 背景
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

      {/* チャット */}
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
