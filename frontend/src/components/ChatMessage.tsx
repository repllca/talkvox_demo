import React from "react";

export default function ChatMessage({ message }) {
  const isUser = message.sender === "user";
  const isMonologue = message.type === "monologue";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2 px-4`}
    >
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl shadow ${
          isUser
            ? "bg-blue-500 text-white rounded-br-none"
            : isMonologue
            ? "bg-gray-200 text-gray-800 italic rounded-bl-none"
            : "bg-green-200 text-gray-800 rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}
