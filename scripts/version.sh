#!/bin/bash
set -e

# Bestimme den Pfad zum Projektroot
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Wechsle zum Projektverzeichnis
cd "$PROJECT_ROOT"

# Generiere die Version
VERSION=$(./scripts/generate-version.sh | tail -n 1)

echo "Aktuelle Version: $VERSION"

# Optionale Parameter
BUILD_BACKEND=false
BUILD_FRONTEND=false
CREATE_TAG=false
COMMIT_VERSION=false

# Parameter-Handling
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --build-backend|--backend) BUILD_BACKEND=true ;;
        --build-frontend|--frontend) BUILD_FRONTEND=true ;;
        --build-all|--all) BUILD_BACKEND=true; BUILD_FRONTEND=true ;;
        --tag) CREATE_TAG=true ;;
        --commit) COMMIT_VERSION=true ;;
        --release) CREATE_TAG=true; COMMIT_VERSION=true ;;
        *) echo "Unbekannter Parameter: $1"; exit 1 ;;
    esac
    shift
done

# Backend-Version-Datei erstellen
create_version_file() {
    # Extrahiere Versionsteile in separate Variablen
    MAJOR_VERSION=${VERSION%%.*}
    MINOR_VERSION=${VERSION#*.}
    MINOR_VERSION=${MINOR_VERSION%%.*}
    PATCH_VERSION=${VERSION#*.*.}
    PATCH_VERSION=${PATCH_VERSION%%-*}
    BUILD_HASH=${VERSION##*-}

    # Erstelle Version-Datei für Backend
    mkdir -p backend/version
    cat > backend/version/version.go << EOL
package version

import (
    "fmt"
    "time"
)

var (
    // Major Version, startet bei 1
    Major = ${MAJOR_VERSION}
    // Minor Version, basiert auf der aktuellen Kalenderwoche
    Minor = ${MINOR_VERSION}
    // Patch Version, gesetzt durch CI/CD
    Patch = ${PATCH_VERSION}
    // BuildHash, gesetzt durch CI/CD
    BuildHash = "${BUILD_HASH}"
)

// Version gibt die aktuelle Version als String zurück
func Version() string {
    return fmt.Sprintf("%d.%d.%d-%s", Major, Minor, Patch, BuildHash)
}

// getCalendarWeek berechnet die aktuelle Kalenderwoche
func getCalendarWeek() int {
    _, week := time.Now().ISOWeek()
    return week
}
EOL

    # Erstelle Version-Datei für Frontend
    mkdir -p frontend/src/util
    cat > frontend/src/util/version.ts << EOL
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
    return "${VERSION}";
}
EOL

    # Erstelle auch eine VERSION.txt Datei im Projektverzeichnis
    echo "$VERSION" > VERSION.txt
}

# Backend bauen
if [ "$BUILD_BACKEND" = true ]; then
    echo "Backend wird mit Version $VERSION gebaut..."
    
    create_version_file
    
    # Kompiliere das Backend
    cd backend
    go build -v ./...
    cd ..
fi

# Frontend bauen
if [ "$BUILD_FRONTEND" = true ]; then
    echo "Frontend wird mit Version $VERSION gebaut..."
    
    # Erstelle version.ts wenn noch nicht geschehen
    create_version_file
    
    cd frontend
    VITE_APP_VERSION=$VERSION npm run build
    cd ..
fi

# Versionsdatei erstellen und committen
if [ "$COMMIT_VERSION" = true ]; then
    echo "Version $VERSION wird in Versionsdateien gespeichert und committed..."
    
    # Erstelle Versionsdateien
    create_version_file
    
    # Änderungen committen
    git add backend/version/version.go frontend/src/util/version.ts VERSION.txt
    git commit -m "build: Version auf $VERSION aktualisiert"
    
    echo "Versions-Commit erstellt. Verwende 'git push' zum Hochladen."
fi

# Git-Tag erstellen
if [ "$CREATE_TAG" = true ]; then
    echo "Git-Tag für Version $VERSION wird erstellt..."
    
    # Prüfe, ob der Tag bereits existiert
    if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        echo "WARNUNG: Tag 'v$VERSION' existiert bereits!"
    else
        git tag -a "v$VERSION" -m "Version $VERSION"
        echo "Tag 'v$VERSION' wurde erstellt. Verwende 'git push --tags' zum Hochladen."
    fi
fi

# Gib die Version zurück (nützlich für Skript-Wiederverwendung)
echo "$VERSION" 