import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useThemeContext, ThemeContext } from "../../context/themeContext";

describe("useThemeContext", () => {
    it("should return theme context values", () => {
        const mockToggleTheme = vi.fn();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ThemeContext.Provider value={{ toggleTheme: mockToggleTheme }}>{children}</ThemeContext.Provider>
        );

        const { result } = renderHook(() => useThemeContext(), { wrapper });

        expect(result.current.toggleTheme).toBe(mockToggleTheme);
    });
});
