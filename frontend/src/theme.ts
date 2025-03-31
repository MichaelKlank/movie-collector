import { createTheme } from "@mui/material";

export const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#1976d2",
        },
    },
});

export const lightTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#1976d2",
        },
        secondary: {
            main: "#dc004e",
        },
        background: {
            default: "#f5f5f5",
            paper: "#ffffff",
        },
        text: {
            primary: "rgba(0, 0, 0, 0.87)",
            secondary: "rgba(0, 0, 0, 0.6)",
        },
        divider: "rgba(0, 0, 0, 0.12)",
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: "#ffffff",
                    color: "rgba(0, 0, 0, 0.87)",
                },
            },
        },
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: "rgba(0, 0, 0, 0.87)",
                },
            },
        },
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#90caf9",
        },
        secondary: {
            main: "#f48fb1",
        },
        background: {
            default: "#121212",
            paper: "#1e1e1e",
        },
        text: {
            primary: "#ffffff",
            secondary: "rgba(255, 255, 255, 0.7)",
        },
        divider: "rgba(255, 255, 255, 0.12)",
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: "#1e1e1e",
                    color: "#ffffff",
                },
            },
        },
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: "#ffffff",
                },
            },
        },
    },
});
