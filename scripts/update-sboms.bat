@echo off
echo Aktualisiere Frontend SBOM...
cd frontend
call npm install
call npx @cyclonedx/cyclonedx-npm --output-file public/sbom.json
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