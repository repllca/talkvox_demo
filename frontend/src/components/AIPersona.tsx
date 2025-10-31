import React from "react";

interface AIPersonaProps {
  name: string;
  images: { normal: string; happy: string; sad: string };
  expression: "normal" | "happy" | "sad";
}

export default function AIPersona({ name, images, expression }: AIPersonaProps) {
  return (
    <div className="flex flex-col items-center">
      <img
        src={images[expression]}
        alt={`${name} (${expression})`}
        className="w-40 h-40 object-cover rounded-full shadow-md transition-all duration-500"
      />
      <p className="mt-3 text-lg font-semibold text-gray-700">{name}</p>
    </div>
  );
}
