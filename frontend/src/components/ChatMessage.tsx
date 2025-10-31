import React from "react";

export default function ChatMessage({ message }) {
  const isUser = message.sender === "user";
  const isMonologue = message.type === "monologue";

  if (isMonologue) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-600 italic px-4 py-2 rounded-full text-sm shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } items-end space-x-2`}
    >
      {!isUser && (
        <div className="w-8 h-8 bg-green-300 rounded-full flex items-center justify-center text-xs font-bold">
          🤖
        </div>
      )}
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl shadow text-sm ${
          isUser
            ? "bg-blue-500 text-white rounded-br-none"
            : "bg-green-200 text-gray-800 rounded-bl-none"
        }`}
      >
        {message.text}
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-blue-300 rounded-full flex items-center justify-center text-xs font-bold">
          👤
        </div>
      )}
    </div>
  );
}
