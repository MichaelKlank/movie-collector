import { ReactNode, useState } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { darkTheme, lightTheme } from "./theme";
import { ThemeContext, useThemeContext } from "./context/themeContext";

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
// eslint-disable-next-line import/no-anonymous-default-export
export { useThemeContext };
