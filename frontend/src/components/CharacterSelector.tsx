interface CharacterSelectorProps {
  characters: string[];
  selected: string;
  onSelect: (name: string) => void;
}

export default function CharacterSelector({
  characters,
  selected,
  onSelect,
}: CharacterSelectorProps) {
  return (
    <div className="flex gap-3 mb-6 justify-center">
      {characters.map((char) => (
        <button
          key={char}
          onClick={() => onSelect(char)}
          className={`px-3 py-1 rounded-md ${
            selected === char
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
