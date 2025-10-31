import React, { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import charactersData from "../data/characters.json";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      type: "normal",
      text: "こんにちは！ソラです✨",
      avatar: "/rei/normal.png",
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = (text: string) => {
    // ユーザー発言
    setMessages((prev) => [
      ...prev,
      { sender: "user", type: "normal", text },
    ]);

    // AI応答（サンプル）
    setTimeout(() => {
      const botText = `なるほど、${text}ですね😊`;
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          type: "normal",
          text: botText,
          avatar: "/rei/normal.png",
        },
      ]);
    }, 600);

    // AI独り言（サンプル）
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          type: "monologue",
          text: "今日は天気が良くて気持ちいいなぁ〜",
        },
      ]);
    }, 1200);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto mt-10 bg-gradient-to-b from-blue-50 to-white shadow-2xl rounded-2xl border border-gray-300 overflow-hidden">
      {/* タイトル */}
      <div className="bg-blue-600 text-white text-center py-3 font-bold text-lg shadow">
        ソラとのチャット
      </div>

      {/* メッセージ表示 */}
      <div className="flex flex-col flex-grow overflow-y-auto p-4 space-y-3 h-[480px] bg-blue-50">
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className="border-t p-3 bg-white shadow-inner">
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}
