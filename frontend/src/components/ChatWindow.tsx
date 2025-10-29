import ChatMessage from "./ChatMessage";

export default function ChatWindow() {
  const messages = [
    { sender: "user", type: "normal", text: "こんにちは！" },
    { sender: "bot", type: "normal", text: "こんにちは、ソラです！" },
    { sender: "bot", type: "monologue", text: "今日は天気がいいなぁ〜" },
  ];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto mt-10 bg-white shadow-lg rounded-2xl p-4">
      {messages.map((m, i) => (
        <ChatMessage key={i} message={m} />
      ))}
    </div>
  );
}
