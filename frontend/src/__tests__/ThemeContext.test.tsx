import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useThemeContext } from "../ThemeContext";
import { Button } from "@mui/material";

describe("ThemeProvider", () => {
    const TestComponent = () => {
        const { toggleTheme } = useThemeContext();
        return <Button onClick={toggleTheme}>Toggle Theme</Button>;
    };

    it("sollte den initialen Dark Mode korrekt setzen", () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
        expect(document.documentElement.getAttribute("data-mui-color-scheme")).toBe("dark");
    });

    it("sollte zwischen Light und Dark Mode wechseln", async () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const button = screen.getByRole("button");

        // Initial ist Dark Mode
        expect(document.documentElement.getAttribute("data-mui-color-scheme")).toBe("dark");

        // Wechsel zu Light Mode
        await act(async () => {
            button.click();
        });
        expect(document.documentElement.getAttribute("data-mui-color-scheme")).toBe("light");

        // Wechsel zurück zu Dark Mode
        await act(async () => {
            button.click();
        });
        expect(document.documentElement.getAttribute("data-mui-color-scheme")).toBe("dark");
    });

    it("sollte den Theme Context korrekt an Kinder weitergeben", () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
    });
});
