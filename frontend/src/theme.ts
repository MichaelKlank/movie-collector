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
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
});
