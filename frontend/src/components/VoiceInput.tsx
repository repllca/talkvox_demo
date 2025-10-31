import { useEffect, useState, useRef } from "react";

export default function VoiceInput({ onText }: { onText: (t: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; ++i)
        text += e.results[i][0].transcript;
      onText(text);
    };

    recognitionRef.current = recognition;
  }, [onText]);

  return (
    <button
      onClick={() => {
        if (!recognitionRef.current) return;
        if (isListening) recognitionRef.current.stop();
        else recognitionRef.current.start();
        setIsListening(!isListening);
      }}
      className={`px-4 py-2 rounded-lg shadow ${
        isListening ? "bg-red-500" : "bg-green-500"
      } text-white`}
    >
      {isListening ? "停止" : "🎙 音声入力"}
    </button>
  );
}
