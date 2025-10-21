// src/pages/Home.tsx
import React, { useState } from "react"
import ChatInput from "../components/ChatInput"

export default function Home() {
  const [messages, setMessages] = useState<string[]>([])

  // ChatInput から送られてきたメッセージを処理
  const handleSend = async (message: string) => {
    // ユーザーの発言をまず画面に追加
    setMessages((prev) => [...prev, `🧑‍💻: ${message}`])

    try {
      // FastAPI にリクエストを送信
      const res = await fetch("http://localhost:8000/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: message }),
      })

      const data = await res.json()

      // AI の返答を追加
      setMessages((prev) => [...prev, `🤖: ${data.response}`])
    } catch (err) {
      console.error("送信エラー:", err)
      setMessages((prev) => [...prev, "⚠️ エラーが発生しました"])
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <h2 className="text-xl font-bold p-4">🏠 Home Page</h2>

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className="p-2 rounded bg-white shadow-sm">
            {msg}
          </div>
        ))}
      </div>

      {/* 入力欄 */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
