import React from "react";
import ChatMessage from "./ChatMessage";

export default function ChatWindow() {
  const messages = [
    { sender: "user", type: "normal", text: "こんにちは！" },
    { sender: "bot", type: "normal", text: "こんにちは、ソラです！" },
    { sender: "bot", type: "monologue", text: "今日は天気がいいなぁ〜" },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto mt-10 bg-gradient-to-b from-blue-50 to-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-blue-600 text-white text-center py-3 font-semibold">
        ソラとのチャット
      </div>

      <div className="flex flex-col flex-grow overflow-y-auto p-4 space-y-3 h-[500px]">
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
      </div>

      <div className="border-t p-3 flex gap-2 bg-white">
        <input
          type="text"
          placeholder="メッセージを入力..."
          className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow">
          送信
        </button>
      </div>
    </div>
  );
}
