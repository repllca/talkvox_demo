import { useState } from "react";

interface Props {
  onSend: (text: string) => void;
  loading?: boolean;
}

export default function MessageInput({ onSend, loading }: Props) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim() || loading) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex items-center gap-2 border-t bg-white p-3 rounded-b-3xl">
      <input
        className="flex-1 px-4 py-2 border rounded-xl focus:outline-none"
        placeholder="メッセージを入力..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
      />
      <button
        onClick={handleSend}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 disabled:opacity-50"
      >
        送信
      </button>
    </div>
  );
}
