// SearchBar — full width search input with icon
import { Search } from 'lucide-react';

function SearchBar({ value, onChange, placeholder = 'Search listings...' }) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white
          text-gray-900 placeholder-gray-400 text-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          transition-all duration-200"
      />
    </div>
  );
}

export default SearchBar;
