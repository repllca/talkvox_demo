import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import AIPersona from "./AIPersona";
import charactersData from "../data/characters.json";

interface ChatWindowProps {
  selected: keyof typeof charactersData;
  expression: "normal" | "happy" | "sad";
  setExpression: (exp: "normal" | "happy" | "sad") => void;
}

export default function ChatWindow({ selected, expression, setExpression }: ChatWindowProps) {
  const character = charactersData[selected];
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: `こんにちは！${selected}です✨`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    setLoading(true);

    // ユーザー発言
    setMessages((prev) => [...prev, { sender: "user", text }]);

    try {
      const personalityPrompt = `あなたの性格は「${character.personality}」です。ユーザー: ${text}`;

      const chatRes = await fetch("http://localhost:8000/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: personalityPrompt }),
      });

      const chatData: { response: string; emotion?: "happy" | "sad" | "normal" } = await chatRes.json();
      const botReply = chatData.response || "……（応答なし）";
      const botEmotion = chatData.emotion || "normal";

      setTimeout(async () => {
        setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
        setExpression(botEmotion);

        // VOICEVOX 音声
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
        { sender: "bot", text: "エラーが発生しました😢" },
      ]);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-white/70 backdrop-blur-xl shadow-2xl rounded-3xl p-4 border border-white/40 w-full max-w-2xl mx-auto">
      {/* 🧑 キャラクター表示：固定 */}
      <div className="mb-4">
        <AIPersona
          name={character.name}
          image={character.images[expression]}
          expression={expression}
        />
      </div>

      {/* 💬 チャット部分（スクロール） */}
      <div className="flex-1 w-full overflow-y-auto h-96 space-y-3 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ✏️ 入力欄 */}
      <div className="border-t p-3 bg-white w-full shadow-inner mt-2 rounded-b-3xl">
        <MessageInput onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
}
