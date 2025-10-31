import React, { useState, useEffect } from "react";

interface AIPersonaProps {
  name: string;
  voiceType: string;
  personality: string;
  images: { normal: string; happy: string; sad: string };
  expression?: "normal" | "happy" | "sad"; // ← 外部から制御可能
}

const AIPersona: React.FC<AIPersonaProps> = ({
  name,
  images,
  expression,
}) => {
  const [currentExp, setCurrentExp] = useState<keyof typeof images>("normal");

  // 外部から表情が変化した場合に反映
  useEffect(() => {
    if (expression) {
      setCurrentExp(expression);
    }
  }, [expression]);

  return (
    <div className="flex flex-col items-center mt-4 transition-all duration-300">
      {/* 表情画像 */}
      <img
        src={images[currentExp]}
        alt={`${name} ${currentExp}`}
        className="w-32 h-32 object-cover rounded-full shadow-lg transition-opacity duration-300"
      />

      {/* 名前 */}
      <div className="mt-2 font-bold text-lg text-gray-700">{name}</div>

      {/* 手動切り替えボタン（開発・確認用） */}
      <div className="mt-2 flex gap-2">
        {Object.keys(images).map((exp) => (
          <button
            key={exp}
            onClick={() => setCurrentExp(exp as keyof typeof images)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              currentExp === exp
                ? "bg-blue-500 text-white"
                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
            }`}
          >
            {exp}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIPersona;
