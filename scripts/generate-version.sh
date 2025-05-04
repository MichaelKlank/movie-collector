#!/bin/bash
set -e

# Generiert eine Versionsnummer im SemVer-Format
# Beispiel: 1.33.5-a1b2c3d (Major.KW.Patch-Hash)

# Major Version ist fest auf 1
MAJOR_VERSION=1

# Minor Version basiert auf der aktuellen Kalenderwoche
MINOR_VERSION=$(date +%V)

# Patch Version
# Falls wir keinen genauen Wochen-Beginn berechnen können, nehmen wir die letzten 7 Tage
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS spezifischer Code
    PATCH_VERSION=$(git rev-list --count --since="1 week ago" HEAD)
    echo "Hinweis: Auf macOS wird die Patch-Version anhand der Commits der letzten 7 Tage berechnet."
else
    # Linux/CI spezifischer Code
    CURRENT_WEEK=$(date +%V)
    CURRENT_YEAR=$(date +%Y)
    WEEK_START=$(date -d "$CURRENT_YEAR-01-01 +$(($CURRENT_WEEK - 1)) weeks" +%Y-%m-%d)
    PATCH_VERSION=$(git rev-list --count --since="$WEEK_START" HEAD)
fi

# Fallback wenn PATCH_VERSION leer ist
if [ -z "$PATCH_VERSION" ]; then
    PATCH_VERSION=0
fi

# Build Hash (kurzer Git-Hash)
BUILD_HASH=$(git rev-parse --short HEAD)

# Vollständige Version
VERSION_STRING="$MAJOR_VERSION.$MINOR_VERSION.$PATCH_VERSION-$BUILD_HASH"

# Output für Menschen lesbar
echo "Version: $VERSION_STRING"
echo "Details:"
echo "  Major:   $MAJOR_VERSION (fest)"
echo "  Minor:   $MINOR_VERSION (KW)"
echo "  Patch:   $PATCH_VERSION (Commits)"
echo "  Build:   $BUILD_HASH (Git-Hash)"

# Output im CI-kompatiblen Format
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "major_version=$MAJOR_VERSION" >> $GITHUB_OUTPUT
    echo "minor_version=$MINOR_VERSION" >> $GITHUB_OUTPUT
    echo "patch_version=$PATCH_VERSION" >> $GITHUB_OUTPUT
    echo "build_hash=$BUILD_HASH" >> $GITHUB_OUTPUT
    echo "version_string=$VERSION_STRING" >> $GITHUB_OUTPUT
fi

# Gibt den Versionsstring zurück (für Shell-Verwendung)
echo "$VERSION_STRING" 