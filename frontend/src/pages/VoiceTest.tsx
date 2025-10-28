import { useState } from "react";

export default function VoiceTest() {
  const [text, setText] = useState("");
  const [character, setCharacter] = useState("default");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        text: text,       // ← ユーザの入力文字
        character: 1           // ← キャラクター番号
  }),
      });

      if (!res.ok) throw new Error("生成に失敗しました");

      const data = await res.json();
      setAudioUrl(`http://localhost:8000${data.audio_path}`);
    } catch (err) {
      console.error(err);
      alert("音声生成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    } else {
      alert("音声がまだ生成されていません");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-2xl font-bold mb-4">🎙️ Voice Generator Test</h1>

      <textarea
        className="w-80 h-24 border rounded p-2"
        placeholder="話してほしいテキストを入力..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <select
        className="border rounded p-2"
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
      >
        <option value="default">Default</option>
        <option value="miku">Miku</option>
        <option value="ai">AI</option>
        <option value="robot">Robot</option>
      </select>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handleGenerate}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "生成中..." : "音声を生成"}
        </button>

        <button
          onClick={handlePlay}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          再生
        </button>
      </div>

      {audioUrl && (
        <p className="text-gray-500 mt-3 text-sm">
          ファイル: {audioUrl}
        </p>
      )}
    </div>
  );
}
