import { createContext, useContext } from "react";

interface ThemeContextType {
    toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
    toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);
