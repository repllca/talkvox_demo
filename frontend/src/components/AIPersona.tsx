import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface PersonaProps {
  name: string;
  images: {
    normal: string;
    happy: string;
    sad: string;
  };
  expression: "normal" | "happy" | "sad";
  speech?: string; // 💬 一時的な吹き出しメッセージ
}


export default function AIPersona({ name, images, expression, speech }: PersonaProps) {
  const image = images[expression];
  const expressionFilter =
    expression === "happy"
      ? "brightness(1.1) saturate(1.2)"
      : expression === "sad"
      ? "grayscale(1) contrast(0.9) brightness(0.9)"
      : "none";

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* キャラ画像 */}
      <motion.img
        key={expression}
        src={image}
        alt={`${name} (${expression})`}
        className="w-64 h-auto rounded-xl shadow-lg"
        style={{ filter: expressionFilter }}
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />

      {/* 💬 吹き出し（AnimatePresenceでフェードイン・アウト） */}
      <AnimatePresence>
        {speech && (
          <motion.div
            key={speech}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="absolute -top-16 left-64 bg-white border border-gray-300 shadow-lg rounded-2xl px-4 py-2 text-gray-800 text-sm font-medium max-w-xs"
          >
            {speech}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2 text-lg font-semibold text-gray-700">{name}</p>
    </motion.div>
  );
}
