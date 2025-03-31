import { render, screen, fireEvent } from "@testing-library/react";
import { AlphabetIndex } from "../../components/AlphabetIndex";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../../theme";
import { vi } from "vitest";

describe("AlphabetIndex", () => {
    const mockOnLetterClick = vi.fn();
    const availableLetters = ["A", "B", "C", "D", "E"];

    const renderWithTheme = (component: React.ReactNode) => {
        return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
    };

    it("renders all alphabet letters", () => {
        renderWithTheme(<AlphabetIndex availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />);

        const alphabet = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        alphabet.forEach((letter) => {
            const element = screen.getByText(letter);
            expect(element).toBeInTheDocument();
        });
    });

    it("marks current letter as active", () => {
        renderWithTheme(
            <AlphabetIndex currentLetter='B' availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />
        );

        const activeLetter = screen.getByText("B");
        expect(activeLetter).toHaveClass("MuiTypography-root");
        expect(activeLetter).toHaveStyle({
            opacity: 1,
            pointerEvents: "auto",
        });
    });

    it("disables unavailable letters", () => {
        renderWithTheme(<AlphabetIndex availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />);

        const unavailableLetter = screen.getByText("F");
        expect(unavailableLetter).toHaveStyle({
            opacity: 0.3,
            pointerEvents: "none",
        });
    });

    it("enables available letters", () => {
        renderWithTheme(<AlphabetIndex availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />);

        const availableLetter = screen.getByText("A");
        expect(availableLetter).toHaveStyle({
            opacity: 1,
            pointerEvents: "auto",
        });
    });

    it("calls onLetterClick when clicking an available letter", () => {
        renderWithTheme(<AlphabetIndex availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />);

        const letterA = screen.getByText("A");
        fireEvent.click(letterA);
        expect(mockOnLetterClick).toHaveBeenCalledWith("A");
    });

    it("does not call onLetterClick when clicking an unavailable letter", () => {
        mockOnLetterClick.mockReset();
        renderWithTheme(<AlphabetIndex availableLetters={availableLetters} onLetterClick={mockOnLetterClick} />);

        const letterF = screen.getByText("F");
        fireEvent.click(letterF);
        expect(mockOnLetterClick).not.toHaveBeenCalled();
    });
});
