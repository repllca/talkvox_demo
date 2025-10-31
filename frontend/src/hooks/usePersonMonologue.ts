// frontend/src/hooks/usePersonMonologue.ts
import { useEffect } from "react";

type PersonEvent = {
  persons: any[];
  events?: {
    entered?: number[];
    left?: number[];
    count?: number;
  };
};

export function usePersonMonologue(
  wsUrl: string,
  addMessage: (msg: { sender: string; type: string; text: string }) => void
) {
  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log("👁 person WS connected");
    ws.onclose = () => console.log("👁 person WS closed");
    ws.onerror = (err) => console.error("⚠️ person WS error", err);

    ws.onmessage = (ev) => {
      const data: PersonEvent = JSON.parse(ev.data);

      const count = data.events?.count ?? data.persons?.length ?? 0;

      // 新しく来た人
      if (data.events?.entered?.length) {
        addMessage({
          sender: "bot",
          type: "monologue",
          text:
            count > 1
              ? `新しい人が来たみたい！今は${count}人いるよ。`
              : `誰か来た？こんにちは〜！`,
        });
      }

      // 誰かいなくなった
      if (data.events?.left?.length) {
        addMessage({
          sender: "bot",
          type: "monologue",
          text:
            count === 0
              ? "あれ、誰もいなくなっちゃった…"
              : `何人か帰っちゃったかな。今は${count}人だね。`,
        });
      }

      // 人が増えすぎた
      if (count >= 3) {
        addMessage({
          sender: "bot",
          type: "monologue",
          text: "わっ、にぎやかになってきたな〜！",
        });
      }
    };

    return () => ws.close();
  }, [wsUrl, addMessage]);
}
