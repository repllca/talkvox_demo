import React, { useState } from "react";

interface Props {
  onSend: (text: string) => void;
}

export default function MessageInput({ onSend }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex w-full max-w-xl mt-3">
      <input
        className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none"
        placeholder="メッセージを入力..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button
        className="bg-blue-500 text-white px-4 rounded-r-lg hover:bg-blue-600"
        onClick={handleSend}
      >
        送信
      </button>
    </div>
  );
}
