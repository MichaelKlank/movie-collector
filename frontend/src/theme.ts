import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#90caf9",
        },
        secondary: {
            main: "#ce93d8",
        },
        background: {
            default: "#121212",
            paper: "#1e1e1e",
        },
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundImage: "none",
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                },
            },
        },
    },
});
