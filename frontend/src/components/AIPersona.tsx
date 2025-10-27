import { useState } from "react";

type Emotion = "normal" | "happy" | "sad";

interface PersonaProps {
  name: string;
  voiceType: string;
  personality: string;
  images: Record<Emotion, string>;
}

export default function AIPersona({
  name,
  voiceType,
  personality,
  images,
}: PersonaProps) {
  const [emotion, setEmotion] = useState<Emotion>("normal");

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-md w-80">
      <h2 className="text-xl font-semibold mb-2">{name}</h2>

      <img
        src={images[emotion]}
        alt={emotion}
        className="w-48 h-48 object-cover rounded-full border"
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setEmotion("happy")}
          className="px-2 py-1 bg-yellow-200 rounded"
        >
          😊
        </button>
        <button
          onClick={() => setEmotion("normal")}
          className="px-2 py-1 bg-gray-200 rounded"
        >
          😐
        </button>
        <button
          onClick={() => setEmotion("sad")}
          className="px-2 py-1 bg-blue-200 rounded"
        >
          😢
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">声のタイプ：{voiceType}</p>
        <p className="text-sm text-gray-600">性格：{personality}</p>
      </div>
    </div>
  );
}
