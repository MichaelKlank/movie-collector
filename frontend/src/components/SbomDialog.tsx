import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tabs,
    Tab,
    Box,
    Typography,
    CircularProgress,
} from "@mui/material";
import { BACKEND_URL } from "../config";

interface SbomDialogProps {
    open: boolean;
    onClose: () => void;
}

interface SbomData {
    components: Array<{
        name: string;
        version: string;
        description?: string;
        licenses?: Array<{
            license: {
                id: string;
                acknowledgement: string;
            };
        }>;
        // Für Go-Module
        purl?: string;
        externalReferences?: Array<{
            url: string;
            type: string;
        }>;
    }>;
}

const SbomDialog: React.FC<SbomDialogProps> = ({ open, onClose }) => {
    const [tabValue, setTabValue] = React.useState(0);
    const [frontendSbom, setFrontendSbom] = React.useState<SbomData | null>(null);
    const [backendSbom, setBackendSbom] = React.useState<SbomData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

    React.useEffect(() => {
        let mounted = true;

        const loadSbom = async () => {
            if (!open) return;

            setLoading(true);
            setErrorMessage(null);
            try {
                // Bestimme die korrekte URL basierend auf der Umgebung
                const isTestEnv = process.env.NODE_ENV === "test";
                const baseUrl = isTestEnv
                    ? `${window.location.origin}/sbom.json`
                    : `${window.location.origin}/app/movie/sbom.json`;

                // Frontend SBOM laden
                const frontendResponse = await fetch(baseUrl);
                if (!frontendResponse.ok) {
                    throw new Error(`Frontend SBOM konnte nicht geladen werden: ${frontendResponse.statusText}`);
                }
                const frontendData = await frontendResponse.json();
                if (mounted) {
                    setFrontendSbom(frontendData);
                }

                // Backend SBOM laden
                const backendResponse = await fetch(`${BACKEND_URL}/sbom`);
                if (!backendResponse.ok) {
                    throw new Error("Backend SBOM konnte nicht geladen werden");
                }
                const backendData = await backendResponse.json();
                if (mounted) {
                    setBackendSbom(backendData);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten";
                setErrorMessage(message);
                if (mounted) {
                    setFrontendSbom({ components: [] });
                    setBackendSbom({ components: [] });
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadSbom();

        return () => {
            mounted = false;
        };
    }, [open]);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const renderSbomTable = (sbom: SbomData | null) => {
        if (loading) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                    <CircularProgress data-testid='loading-state' />
                    <Typography sx={{ ml: 2 }}>Lade SBOM...</Typography>
                </Box>
            );
        }

        if (errorMessage) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                    <Typography color='error'>{errorMessage}</Typography>
                </Box>
            );
        }

        if (!sbom || sbom.components.length === 0) {
            return (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                    <Typography data-testid='no-data-state'>Keine SBOM-Daten verfügbar</Typography>
                </Box>
            );
        }

        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Version</TableCell>
                            <TableCell>Lizenz</TableCell>
                            <TableCell>Beschreibung</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sbom.components.map((component, index) => {
                            // Lizenz aus verschiedenen Quellen extrahieren
                            let license = "-";
                            if (component.licenses && component.licenses.length > 0) {
                                license = component.licenses[0].license.id;
                            } else if (component.purl) {
                                // Für Go-Module: Lizenz aus GitHub Repository ermitteln
                                const githubUrl = component.externalReferences?.find((ref) => ref.type === "vcs")?.url;
                                if (githubUrl) {
                                    license = "GitHub Repository";
                                }
                            }

                            return (
                                <TableRow key={index}>
                                    <TableCell>{component.name}</TableCell>
                                    <TableCell>{component.version}</TableCell>
                                    <TableCell>{license}</TableCell>
                                    <TableCell>{component.description || "-"}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth>
            <DialogTitle>Software Bill of Materials (SBOM)</DialogTitle>
            <DialogContent>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab label='Frontend' />
                        <Tab label='Backend' />
                    </Tabs>
                </Box>
                <Box sx={{ mt: 2 }}>
                    {tabValue === 0 && renderSbomTable(frontendSbom)}
                    {tabValue === 1 && renderSbomTable(backendSbom)}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Schließen</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SbomDialog;
