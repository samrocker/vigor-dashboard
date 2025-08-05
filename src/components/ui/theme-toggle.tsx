// components/ui/theme-toggle.tsx
import React from 'react';
import { Moon, Sun } from 'lucide-react'; // Assuming you use lucide icons

interface ThemeToggleProps {
    isDark: boolean;
    onToggle: () => void;
    size?: "default" | "iconOnly"; // Add a size prop
}

export const ThemeToggle = ({ isDark, onToggle, size = "default" }: ThemeToggleProps) => {
    if (size === "iconOnly") {
        return (
            <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center"
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
                {isDark ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        );
    }

    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
        >
            <span className="font-medium">Switch Theme</span>
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
};