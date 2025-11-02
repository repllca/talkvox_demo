import React, { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import styles from "./ChatWindow.module.css";

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
    <div className={styles.window}>
      {/* タイトル */}
      <div className={styles.header}>ソラとのチャット</div>

      {/* メッセージ表示 */}
      <div className={styles.messageArea}>
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className={styles.inputArea}>
        <MessageInput onSend={handleSend} />
      </div>
    </div>
  );
}
