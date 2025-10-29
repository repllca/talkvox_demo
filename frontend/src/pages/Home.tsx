import { useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";

// 画像をimport
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
    images: { normal: sora_normal, happy: sora_happy, sad: sora_sad },
  },
  レイ: {
    name: "レイ",
    voiceType: "落ち着いた男性の声",
    personality: "知的で穏やか",
    images: { normal: rei_normal, happy: rei_happy, sad: rei_sad },
  },
};

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof characters>("ソラ");

  // チャットの状態
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");

  // メッセージ送信
  const handleSend = () => {
    if (!input.trim()) return;

    // ユーザー発言を追加
    const newMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, newMessage]);

    // AIの仮応答（後でAPI接続可）
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "normal", text: "なるほど、面白いですね！" },
        { sender: "bot", type: "monologue", text: "…この人、ちょっと変わってるかも。" },
      ]);
    }, 800);

    setInput("");
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
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
