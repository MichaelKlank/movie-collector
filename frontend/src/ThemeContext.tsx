import { createContext, useContext, useState, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { lightTheme, darkTheme } from "./theme";

interface ThemeContextType {
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [isDarkMode, setIsDarkMode] = useState(true);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ toggleTheme }}>
            <MuiThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
