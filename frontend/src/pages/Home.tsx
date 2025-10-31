import { useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";
import ChatMessage from "../components/ChatMessage";
import charactersData from "../data/characters.json"; // JSON管理

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof charactersData>("ソラ");
  const [messages, setMessages] = useState([
    { sender: "bot", type: "normal", text: "こんにちは！ソラです✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expression, setExpression] = useState<"normal" | "happy" | "sad">(
    "normal"
  );

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { sender: "user", type: "normal", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { sender: "bot", type: "thinking", text: "……考え中です🤔" },
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

        // VOICEVOX 音声生成
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
      <CharacterSelector
        characters={Object.keys(charactersData)}
        selected={selected}
        onSelect={(name) => setSelected(name as keyof typeof charactersData)}
      />

      <AIPersona {...charactersData[selected]} expression={expression} />

      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl mt-6 p-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 h-80 border border-gray-200 rounded-lg p-3">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

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
