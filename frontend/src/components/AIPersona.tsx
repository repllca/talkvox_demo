import { motion } from "framer-motion";

interface PersonaProps {
  name: string;
  image: string;
  expression: "normal" | "happy" | "sad";
}

export default function AIPersona({ name, image, expression }: PersonaProps) {
  const expressionFilter =
    expression === "happy"
      ? "brightness-110 saturate-120"
      : expression === "sad"
      ? "grayscale contrast-90 brightness-90"
      : "";

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.img
        key={expression}
        src={image}
        alt={name}
        className={`w-64 h-auto drop-shadow-2xl transition-all duration-500 ${expressionFilter}`}
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />
      <p className="mt-2 text-lg font-semibold text-gray-700">{name}</p>
    </motion.div>
  );
}
