import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const IndexContainer = styled(Box)(({ theme }) => ({
    position: "fixed",
    right: theme.spacing(1),
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[2],
    zIndex: 1000,
}));

const IndexLetter = styled(Typography)<{ active?: string }>(({ theme, active }) => ({
    cursor: "pointer",
    padding: theme.spacing(0.5),
    minWidth: "24px",
    textAlign: "center",
    borderRadius: theme.shape.borderRadius,
    ...(active === "true" && {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    }),
    "&:hover": {
        backgroundColor: active === "true" ? theme.palette.primary.dark : theme.palette.action.hover,
    },
}));

interface AlphabetIndexProps {
    currentLetter?: string;
    availableLetters: string[];
    onLetterClick: (letter: string) => void;
}

export const AlphabetIndex = ({ currentLetter, availableLetters, onLetterClick }: AlphabetIndexProps) => {
    const alphabet = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

    return (
        <IndexContainer>
            {alphabet.map((letter) => (
                <IndexLetter
                    key={letter}
                    variant='body2'
                    active={currentLetter === letter ? "true" : "false"}
                    onClick={() => availableLetters.includes(letter) && onLetterClick(letter)}
                    sx={{
                        opacity: availableLetters.includes(letter) ? 1 : 0.3,
                        pointerEvents: availableLetters.includes(letter) ? "auto" : "none",
                    }}
                >
                    {letter}
                </IndexLetter>
            ))}
        </IndexContainer>
    );
};
