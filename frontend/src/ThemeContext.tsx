import { ReactNode, useState, useEffect } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { darkTheme, lightTheme } from "./theme";
import { ThemeContext } from "./context/themeContext";

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        document.documentElement.setAttribute("data-mui-color-scheme", isDarkMode ? "dark" : "light");
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    return (
        <ThemeContext.Provider value={{ toggleTheme }}>
            <MuiThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>{children}</MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
