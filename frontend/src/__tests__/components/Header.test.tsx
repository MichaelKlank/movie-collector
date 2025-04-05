import { render, screen, fireEvent, waitForElementToBeRemoved } from "@testing-library/react";
import { vi } from "vitest";
import { Header } from "../../components/Header";
import { ThemeContext } from "../../context/themeContext";
import { ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
});

const lightTheme = createTheme({
    palette: {
        mode: "light",
    },
});

describe("Header", () => {
    let mockToggleTheme: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockToggleTheme = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const renderWithTheme = (ui: React.ReactElement, theme = lightTheme) => {
        return render(
            <ThemeContext.Provider value={{ toggleTheme: mockToggleTheme }}>
                <ThemeProvider theme={theme}>{ui}</ThemeProvider>
            </ThemeContext.Provider>
        );
    };

    it("sollte den Titel anzeigen", () => {
        renderWithTheme(<Header />);
        expect(screen.getByText("Meine DVD-Sammlung")).toBeInTheDocument();
    });

    it("sollte das Theme-Toggle-Icon anzeigen", () => {
        renderWithTheme(<Header />);
        expect(screen.getByTestId("theme-toggle-button")).toBeInTheDocument();
    });

    it("sollte das SBOM-Icon anzeigen", () => {
        renderWithTheme(<Header />);
        expect(screen.getByTestId("sbom-button")).toBeInTheDocument();
    });

    it("sollte das Theme umschalten, wenn auf den Theme-Button geklickt wird", () => {
        renderWithTheme(<Header />);
        const themeButton = screen.getByTestId("theme-toggle-button");
        fireEvent.click(themeButton);
        expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it("sollte das korrekte Theme-Icon im Dark Mode anzeigen", () => {
        renderWithTheme(<Header />, darkTheme);
        expect(screen.getByTestId("theme-toggle-button")).toBeInTheDocument();
    });

    it("sollte den SBOM-Dialog öffnen, wenn auf das SBOM-Icon geklickt wird", () => {
        renderWithTheme(<Header />);
        const sbomButton = screen.getByTestId("sbom-button");
        fireEvent.click(sbomButton);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("sollte den SBOM-Dialog schließen, wenn der Dialog geschlossen wird", async () => {
        renderWithTheme(<Header />);
        const sbomButton = screen.getByTestId("sbom-button");
        fireEvent.click(sbomButton);
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();

        const closeButton = screen.getByRole("button", { name: /schließen/i });
        fireEvent.click(closeButton);
        await waitForElementToBeRemoved(dialog);
    });
});
