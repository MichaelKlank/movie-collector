import { Chip, Stack, Tooltip } from "@mui/material";
import { useVersionContext } from "../context/versionContext";
import InfoIcon from "@mui/icons-material/Info";

export const VersionInfo: React.FC = () => {
    const { frontendVersion, backendVersion, isLoading, error } = useVersionContext();

    return (
        <Stack direction='row' spacing={1} alignItems='center'>
            <Tooltip title='Frontend / Backend Versionen'>
                <InfoIcon fontSize='small' color='disabled' />
            </Tooltip>
            <Stack direction='row' spacing={1}>
                <Chip label={`FE: ${frontendVersion}`} size='small' variant='outlined' color='primary' />
                <Chip
                    label={`BE: ${isLoading ? "Lädt..." : error ? "Fehler" : backendVersion}`}
                    size='small'
                    variant='outlined'
                    color={error ? "error" : "primary"}
                />
            </Stack>
        </Stack>
    );
};
