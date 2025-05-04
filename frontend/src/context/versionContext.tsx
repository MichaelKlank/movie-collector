import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { getFrontendVersion } from "../util/version";

// Version interface
interface Version {
    version: string;
}

// Constants
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8082";

// Verwende die dynamisch ermittelte Frontend-Version
const FRONTEND_VERSION = getFrontendVersion();

// Context types
interface VersionContextType {
    frontendVersion: string;
    backendVersion: string;
    isLoading: boolean;
    error: string | null;
}

// Default context values
const defaultVersionContext: VersionContextType = {
    frontendVersion: FRONTEND_VERSION,
    backendVersion: "Lädt...",
    isLoading: true,
    error: null,
};

// Create context
const VersionContext = createContext<VersionContextType>(defaultVersionContext);

// Custom hook to use the version context
export const useVersionContext = () => useContext(VersionContext);

// Provider component
export const VersionProvider = ({ children }: { children: ReactNode }) => {
    const [backendVersion, setBackendVersion] = useState<string>("Lädt...");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBackendVersion = async () => {
            try {
                const response = await axios.get<Version>(`${BACKEND_URL}/version`);
                setBackendVersion(response.data.version);
                setIsLoading(false);
            } catch (err) {
                console.error("Fehler beim Abrufen der Backend-Version:", err);
                setError("Fehler beim Abrufen der Backend-Version");
                setBackendVersion("Nicht verfügbar");
                setIsLoading(false);
            }
        };

        fetchBackendVersion();
    }, []);

    return (
        <VersionContext.Provider
            value={{
                frontendVersion: FRONTEND_VERSION,
                backendVersion,
                isLoading,
                error,
            }}
        >
            {children}
        </VersionContext.Provider>
    );
};
