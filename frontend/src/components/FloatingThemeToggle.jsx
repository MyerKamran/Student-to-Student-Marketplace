import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function FloatingThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed left-5 bottom-5 z-40 bg-white border border-gray-200 rounded-full shadow-lg p-1.5 flex items-center gap-1">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          theme === 'light'
            ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        aria-label="Switch to light mode"
        title="Light mode"
      >
        <Sun size={18} />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        aria-label="Switch to dark mode"
        title="Dark mode"
      >
        <Moon size={18} />
      </button>
    </div>
  );
}

export default FloatingThemeToggle;

