import { motion } from "framer-motion";
import styles from "./ChatMessage.module.css";

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

  const bubbleClass = isUser
    ? styles.userBubble
    : isError
    ? styles.errorBubble
    : isMonologue
    ? styles.monologueBubble
    : styles.botBubble;

  const rowClass = isUser
    ? styles.userRow
    : isMonologue
    ? styles.centerRow
    : styles.botRow;

  return (
    <motion.div
      className={`${styles.messageRow} ${rowClass}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Bot側（左）にアバターを表示 */}
      {!isUser && !isMonologue && message.avatar && (
        <img src={message.avatar} alt="avatar" className={styles.avatar} />
      )}

      <div className={`${styles.bubble} ${bubbleClass}`}>{message.text}</div>
    </motion.div>
  );
}
