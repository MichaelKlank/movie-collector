# SBOM Update Scripts

Diese Scripts aktualisieren die Software Bill of Materials (SBOM) für das Frontend und Backend.

## Verfügbare Scripts

-   `update-sboms.sh`: Für Unix-Systeme (Linux, macOS)
-   `update-sboms.bat`: Für Windows-Systeme

## Voraussetzungen

-   Node.js und npm (für Frontend)
-   Go (für Backend)
-   Git
-   cyclonedx-gomod (für Backend)
-   @cyclonedx/cyclonedx-npm (für Frontend)

## Verwendung

### Unix-Systeme (Linux, macOS)

```bash
# Script ausführbar machen
chmod +x update-sboms.sh

# Script ausführen
./update-sboms.sh
```

### Windows

```batch
# Script ausführen
update-sboms.bat
```

## Was macht das Script?

1. Aktualisiert die Frontend-SBOM:

    - Installiert Abhängigkeiten
    - Generiert neue SBOM mit cyclonedx-npm

2. Aktualisiert die Backend-SBOM:

    - Aktualisiert Go-Module
    - Generiert neue SBOM mit cyclonedx-gomod

3. Committet Änderungen:
    - Prüft auf Änderungen in den SBOMs
    - Committet nur bei tatsächlichen Änderungen
    - Verwendet klare Commit-Nachrichten

## CI/CD Integration

Die SBOMs werden auch automatisch in der CI/CD Pipeline aktualisiert:

-   Bei jedem Push in den main Branch
-   Bei Änderungen an den Abhängigkeiten
-   Mit automatischem Commit und Push
