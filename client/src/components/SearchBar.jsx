import { Search, X } from 'lucide-react';

export default function SearchBar({ 
  placeholder = 'Search...', 
  value, 
  onChange, 
  onClear 
}) {
  return (
    <div className="relative w-full">
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
        <Search size={20} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder-gray-500"
      />
      {value && (
        <button
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
}
