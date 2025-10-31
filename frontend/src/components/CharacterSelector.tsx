interface CharacterSelectorProps {
  characters: string[];
  selected: string;
  onSelect: (name: string) => void;
}

export default function CharacterSelector({ characters, selected, onSelect }: CharacterSelectorProps) {
  return (
    <div className="flex gap-4 mb-4">
      {characters.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className={`px-4 py-2 rounded-xl shadow ${
            c === selected ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
