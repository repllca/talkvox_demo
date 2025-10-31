import React from "react";

interface ChatMessageProps {
  message: { sender: "user" | "bot"; type: string; text: string };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === "user";
  const isThinking = message.type === "thinking";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow ${
          isUser
            ? "bg-blue-500 text-white rounded-br-none"
            : isThinking
            ? "bg-gray-200 italic text-gray-600 rounded-bl-none"
            : "bg-green-100 text-gray-800 rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

