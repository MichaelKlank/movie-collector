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

    React.useEffect(() => {
        // Frontend SBOM laden
        fetch("/app/movie/sbom.json")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Frontend SBOM konnte nicht geladen werden");
                }
                return response.json();
            })
            .then((data) => setFrontendSbom(data))
            .catch((error) => {
                console.error("Error loading frontend SBOM:", error);
                setFrontendSbom({ components: [] });
            });

        // Backend SBOM laden
        fetch(`${BACKEND_URL}/sbom`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Backend SBOM konnte nicht geladen werden");
                }
                return response.json();
            })
            .then((data) => setBackendSbom(data))
            .catch((error) => {
                console.error("Error loading backend SBOM:", error);
                setBackendSbom({ components: [] });
            });
    }, []);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const renderSbomTable = (sbom: SbomData | null) => {
        if (!sbom) return <div>Lade SBOM...</div>;
        if (sbom.components.length === 0) return <div>Keine SBOM-Daten verfügbar</div>;

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
