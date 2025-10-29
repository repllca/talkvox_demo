// src/types/chat.ts

export type Sender = "user" | "robot";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  type: "response" | "monologue"; // robot専用タイプ
}
