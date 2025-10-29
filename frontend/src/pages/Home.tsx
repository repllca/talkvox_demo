import { useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";

import sora_normal from "../assets/sora/normal.png";
import sora_happy from "../assets/sora/happy.png";
import sora_sad from "../assets/sora/sad.png";
import rei_normal from "../assets/rei/normal.png";
import rei_happy from "../assets/rei/happy.png";
import rei_sad from "../assets/rei/sad.png";

const characters = {
  ソラ: {
    name: "ソラ",
    voiceType: "明るい女性の声",
    personality: "ポジティブでフレンドリー",
    speakerId: 1,
    images: { normal: sora_normal, happy: sora_happy, sad: sora_sad },
  },
  レイ: {
    name: "レイ",
    voiceType: "落ち着いた男性の声",
    personality: "とっても暗いキャラクター",
    speakerId: 3,
    images: { normal: rei_normal, happy: rei_happy, sad: rei_sad },
  },
};

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof characters>("ソラ");
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🧠 メッセージ送信
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // 🎬 考え中メッセージを一時表示
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "thinking", text: "……考え中です🤔" },
      ]);

      // 🧩 personalityを含めたプロンプト生成
      const character = characters[selected];
      const personalityPrompt = `あなたの性格は「${character.personality}」みたいな感じです。次のユーザーの発言に応えてください。\n\nユーザー: ${input}`;

      // 🔗 Chat API に送信
      const chatRes = await fetch("http://localhost:8000/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: personalityPrompt }),
      });

      const chatData = await chatRes.json();
      const botReply = chatData.response || "……（応答なし）";

      // 🎬 返答を遅らせて表示
      setTimeout(async () => {
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.type !== "thinking");
          return [...filtered, { sender: "bot", type: "normal", text: botReply }];
        });

        // 🎤 VOICEVOXで音声生成
        try {
          const voiceRes = await fetch("http://localhost:8000/voice/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: botReply,
              character: character.speakerId,
            }),
          });

          const voiceData = await voiceRes.json();

          if (voiceData.audio_path) {
            const audioUrl = `http://localhost:8000/${voiceData.audio_path}`;
            const audio = new Audio(audioUrl);
            audio.play().catch((e) => console.warn("音声再生に失敗:", e));
          }
        } catch (err) {
          console.error("音声生成エラー:", err);
        }

        setLoading(false);
      }, 1200);
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
    <div className="flex flex-col items-center mt-6">
      {/* キャラ選択 */}
      <CharacterSelector
        characters={Object.keys(characters)}
        selected={selected}
        onSelect={(name) => setSelected(name as keyof typeof characters)}
      />

      {/* キャラ表示 */}
      <AIPersona {...characters[selected]} />

      {/* チャット欄 */}
      <div className="w-full max-w-md bg-white shadow rounded-2xl mt-6 p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 h-80 border border-gray-200 rounded-lg p-3">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        {/* 入力欄 */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="メッセージを入力..."
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`${
              loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            } text-white px-4 py-2 rounded-lg shadow`}
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </div>
      </div>
    </div>
  );
}
