import { useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";
import VoiceInput from "../components/VoiceInput";
import usePersonStream from "../hooks/usePersonStream";
import charactersData from "../data/characters.json";

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof charactersData>("ソラ");
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState<"normal" | "happy" | "sad">("normal");
  const persons = usePersonStream(); // 人物検出ストリーム

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage = { sender: "user", type: "normal", text };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setLoading(true);

    const char = charactersData[selected];
    const prompt = `あなたの性格は「${char.personality}」です。次の発言に応答してください。\nユーザー: ${text}`;

    const res = await fetch("http://localhost:8000/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    const botReply = data.response || "……（応答なし）";

    setMessages((m) => [...m, { sender: "bot", type: "normal", text: botReply }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center mt-6">
      <CharacterSelector
        characters={Object.keys(charactersData)}
        selected={selected}
        onSelect={(name) => setSelected(name as keyof typeof charactersData)}
      />

      <AIPersona {...charactersData[selected]} expression={expression} />

      <div className="w-full max-w-md bg-white shadow rounded-2xl mt-6 p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 h-80 border border-gray-200 rounded-lg p-3">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
            placeholder="メッセージを入力..."
            className="flex-1 border rounded-lg px-3 py-2 focus:ring focus:ring-blue-200"
          />
          <button
            onClick={() => handleSend(input)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600"
          >
            送信
          </button>
          <VoiceInput onText={(t) => handleSend(t)} />
        </div>
      </div>

      {/* もし人物が検出されていたら表示 */}
      <div className="mt-6 text-gray-600">
        {persons.length > 0
          ? `👁 検出中の人物: ${persons.length}人`
          : "誰もいません"}
      </div>
    </div>
  );
}
