@echo off
echo Aktualisiere Frontend SBOM...
cd frontend
call npm install
call npx @cyclonedx/cyclonedx-npm --output-file public/sbom.json
rem Ersetze die sich ändernden Werte mit festen Werten
call jq ".serialNumber = \"urn:uuid:00000000-0000-0000-0000-000000000000\" | .metadata.timestamp = \"2024-01-01T00:00:00.000Z\"" public/sbom.json > public/sbom.json.tmp
move /Y public/sbom.json.tmp public/sbom.json
cd ..

echo Aktualisiere Backend SBOM...
cd backend
call go mod tidy
call cyclonedx-gomod mod -json -licenses -assert-licenses -output sbom.json
cd ..

echo Prüfe auf Änderungen in den SBOMs...
git diff --quiet frontend/public/sbom.json backend/sbom.json
if %ERRORLEVEL% EQU 0 (
    echo Keine Änderungen in den SBOMs.
) else (
    echo SBOMs wurden aktualisiert. Committe Änderungen...
    git add frontend/public/sbom.json backend/sbom.json
    git commit -m "chore: update SBOMs"
    echo SBOMs wurden erfolgreich aktualisiert und committed!
) 