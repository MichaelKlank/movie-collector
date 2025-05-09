import { AppBar, IconButton, Toolbar, Typography, useTheme } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import InventoryIcon from "@mui/icons-material/Inventory";
import { useThemeContext } from "../context/themeContext";
import { useState } from "react";
import SbomDialog from "./SbomDialog";
import { VersionInfo } from "./VersionInfo";

export const Header = () => {
    const theme = useTheme();
    const { toggleTheme } = useThemeContext();
    const [sbomOpen, setSbomOpen] = useState(false);

    return (
        <>
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
                    <VersionInfo />
                    <IconButton
                        onClick={() => setSbomOpen(true)}
                        color='inherit'
                        title='SBOM anzeigen'
                        data-testid='sbom-button'
                    >
                        <InventoryIcon />
                    </IconButton>
                    <IconButton onClick={toggleTheme} color='inherit' data-testid='theme-toggle-button'>
                        {theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                </Toolbar>
            </AppBar>
            <SbomDialog open={sbomOpen} onClose={() => setSbomOpen(false)} />
        </>
    );
};
