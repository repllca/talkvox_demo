
import { useState } from "react";
import AIPersona from "../components/AIPersona";
import CharacterSelector from "../components/CharacterSelector";

// 画像をimport
import sora_normal from "../assets/sora/normal.png";
import sora_happy from "../assets/sora/happy.png";
import sora_sad from "../assets/sora/sad.png";
import rei_normal from "../assets/rei/normal.png";
import rei_happy from "../assets/rei/happy.png";
import rei_sad from "../assets/rei/sad.png";

const characters = {
  ソラ: {
    name: "ソラ",
    voiceType: "明るい女性の声",
    personality: "ポジティブでフレンドリー",
    images: { normal: sora_normal, happy: sora_happy, sad: sora_sad },
  },
  レイ: {
    name: "レイ",
    voiceType: "落ち着いた男性の声",
    personality: "知的で穏やか",
    images: { normal: rei_normal, happy: rei_happy, sad: rei_sad },
  },
};

export default function Home() {
  const [selected, setSelected] = useState<keyof typeof characters>("ソラ");

  return (
    <div className="flex flex-col items-center mt-10">
      <CharacterSelector
        characters={Object.keys(characters)}
        selected={selected}
        onSelect={(name) => setSelected(name as keyof typeof characters)}
      />

      <AIPersona {...characters[selected]} />
    </div>
  );
}
