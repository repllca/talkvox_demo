import { useEffect, useState, useRef } from "react";

export interface PersonData {
  id: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  conf: number;
  sim: number;
}

export default function usePersonStream() {
  const [persons, setPersons] = useState<PersonData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws_person");
    wsRef.current = ws;

    ws.onopen = () => console.log("🟢 Person Stream connected");
    ws.onclose = () => console.log("🔴 Person Stream closed");
    ws.onerror = (e) => console.error("⚠️ WS Error:", e);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.persons) setPersons(data.persons);
      } catch (err) {
        console.error("⚠️ JSON Parse error:", err);
      }
    };

    return () => ws.close();
  }, []);

  return persons;
}
