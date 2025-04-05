#!/bin/bash

# Frontend SBOM aktualisieren
echo "Aktualisiere Frontend SBOM..."
cd frontend
npm install
npx @cyclonedx/cyclonedx-npm --output-file public/sbom.json
cd ..

# Backend SBOM aktualisieren
echo "Aktualisiere Backend SBOM..."
cd backend
go mod tidy
cyclonedx-gomod mod -json -licenses -assert-licenses -output sbom.json
cd ..

# Prüfen, ob sich die SBOMs geändert haben
if git diff --quiet frontend/public/sbom.json backend/sbom.json; then
    echo "Keine Änderungen in den SBOMs."
else
    echo "SBOMs wurden aktualisiert. Committe Änderungen..."
    git add frontend/public/sbom.json backend/sbom.json
    git commit -m "chore: update SBOMs"
    echo "SBOMs wurden erfolgreich aktualisiert und committed!"
fi 