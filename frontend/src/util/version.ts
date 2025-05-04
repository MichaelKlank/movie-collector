/**
 * Hilfsfunktionen für die Versionsverwaltung
 */

/**
 * Ermittelt die Frontend-Version
 * 
 * Priorisierung:
 * 1. Umgebungsvariable VITE_APP_VERSION (vom Build-Prozess gesetzt)
 * 2. Fest codierte Version als Fallback
 */
export function getFrontendVersion(): string {
    // 1. Umgebungsvariable prüfen
    const envVersion = import.meta.env.VITE_APP_VERSION;
    if (envVersion) {
        return envVersion as string;
    }
    
    // 2. Aktuelle Version als Fallback
    return "1.18.3-83eb093";
}
