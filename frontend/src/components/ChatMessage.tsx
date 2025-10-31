import { motion } from "framer-motion";

type Message = {
  sender: "user" | "bot";
  type: "normal" | "monologue" | "error";
  text: string;
  avatar?: string; // キャラクター画像URL
};

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.sender === "user";
  const isMonologue = message.type === "monologue";
  const isError = message.type === "error";

  const bubbleStyle = isUser
    ? "bg-blue-500 text-white rounded-br-none shadow-lg"
    : isError
    ? "bg-red-200 text-red-800 rounded-bl-none border border-red-400 shadow-sm"
    : isMonologue
    ? "bg-yellow-100 text-yellow-900 italic border border-yellow-300 rounded-2xl px-4 py-2 shadow-sm"
    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow";

  const alignment = isUser
    ? "justify-end"
    : isMonologue
    ? "justify-center"
    : "justify-start";

  const maxWidth = isMonologue ? "max-w-[80%]" : "max-w-[70%]";

  return (
    <motion.div
      className={`flex ${alignment} w-full`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {!isUser && !isMonologue && message.avatar && (
        <img
          src={message.avatar}
          alt="avatar"
          className="w-8 h-8 rounded-full mr-2 self-end"
        />
      )}
      <div className={`px-4 py-2 rounded-2xl ${bubbleStyle} ${maxWidth}`}>
        {message.text}
      </div>
    </motion.div>
  );
}
