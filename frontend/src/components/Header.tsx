import { AppBar, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useThemeContext } from "../ThemeContext";

export const Header = () => {
    const theme = useTheme();
    const { toggleTheme } = useThemeContext();

    return (
        <AppBar
            position='fixed'
            color='primary'
            sx={{
                marginBottom: 2,
                zIndex: theme.zIndex.drawer + 1,
                boxShadow: theme.shadows[2],
            }}
        >
            <Toolbar>
                <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
                    Meine DVD-Sammlung
                </Typography>
                <IconButton onClick={toggleTheme} color='inherit'>
                    {theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
            </Toolbar>
        </AppBar>
    );
};
