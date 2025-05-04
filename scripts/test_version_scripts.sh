#!/bin/bash
set -e

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Zähler für bestandene und fehlgeschlagene Tests
PASSED=0
FAILED=0

# Funktion zum Ausgeben des Testergebnisses
test_result() {
    local name=$1
    local result=$2
    
    if [ $result -eq 0 ]; then
        echo -e "${GREEN}✓ BESTANDEN${NC}: $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FEHLGESCHLAGEN${NC}: $name"
        FAILED=$((FAILED + 1))
    fi
}

# Teste generate-version.sh
test_generate_version() {
    echo -e "\n${YELLOW}Teste generate-version.sh${NC}"
    
    # 1. Test: Skript existiert und ist ausführbar
    if [ -x "./scripts/generate-version.sh" ]; then
        test_result "Skript ist ausführbar" 0
    else
        test_result "Skript ist ausführbar" 1
        return 1
    fi
    
    # 2. Test: Skript kann ausgeführt werden
    VERSION_OUTPUT=$(./scripts/generate-version.sh)
    if [ $? -eq 0 ]; then
        test_result "Skript kann ausgeführt werden" 0
    else
        test_result "Skript kann ausgeführt werden" 1
        return 1
    fi
    
    # 3. Test: Output enthält "Version:"
    if echo "$VERSION_OUTPUT" | grep -q "Version:"; then
        test_result "Output enthält 'Version:'" 0
    else
        test_result "Output enthält 'Version:'" 1
    fi
    
    # 4. Test: Versionsnummer entspricht dem erwarteten Format
    VERSION_STRING=$(echo "$VERSION_OUTPUT" | tail -n 1)
    if [[ $VERSION_STRING =~ ^[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]+$ ]]; then
        test_result "Versionsnummer hat das richtige Format" 0
    else
        test_result "Versionsnummer hat das richtige Format" 1
        echo "  Erhaltene Version: $VERSION_STRING"
    fi
}

# Teste version.sh
test_version_script() {
    echo -e "\n${YELLOW}Teste version.sh${NC}"
    
    # 1. Test: Skript existiert und ist ausführbar
    if [ -x "./scripts/version.sh" ]; then
        test_result "Skript ist ausführbar" 0
    else
        test_result "Skript ist ausführbar" 1
        return 1
    fi
    
    # 2. Test: Skript kann ausgeführt werden
    VERSION_OUTPUT=$(./scripts/version.sh)
    if [ $? -eq 0 ]; then
        test_result "Skript kann ausgeführt werden" 0
    else
        test_result "Skript kann ausgeführt werden" 1
        return 1
    fi
    
    # 3. Test: Output enthält "Aktuelle Version:"
    if echo "$VERSION_OUTPUT" | grep -q "Aktuelle Version:"; then
        test_result "Output enthält 'Aktuelle Version:'" 0
    else
        test_result "Output enthält 'Aktuelle Version:'" 1
    fi
    
    # 4. Test: Versionsnummer entspricht dem erwarteten Format
    VERSION_STRING=$(echo "$VERSION_OUTPUT" | tail -n 1)
    if [[ $VERSION_STRING =~ ^[0-9]+\.[0-9]+\.[0-9]+-[a-f0-9]+$ ]]; then
        test_result "Versionsnummer hat das richtige Format" 0
    else
        test_result "Versionsnummer hat das richtige Format" 1
        echo "  Erhaltene Version: $VERSION_STRING"
    fi
    
    # 5. Test: Check, dass beide Skripte die gleiche Version ausgeben
    GENERATE_VERSION=$(./scripts/generate-version.sh | tail -n 1)
    VERSION_SCRIPT=$(./scripts/version.sh | tail -n 1)
    
    if [ "$GENERATE_VERSION" = "$VERSION_SCRIPT" ]; then
        test_result "Beide Skripte geben die gleiche Version aus" 0
    else
        test_result "Beide Skripte geben die gleiche Version aus" 1
        echo "  generate-version.sh: $GENERATE_VERSION"
        echo "  version.sh: $VERSION_SCRIPT"
    fi
}

# Haupttestfunktion
main() {
    echo -e "${YELLOW}Starte Tests für Versionierungsskripte${NC}"
    
    test_generate_version
    test_version_script
    
    echo -e "\n${YELLOW}Testergebnis:${NC}"
    echo -e "${GREEN}Bestanden: $PASSED${NC}"
    echo -e "${RED}Fehlgeschlagen: $FAILED${NC}"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}Alle Tests wurden bestanden!${NC}"
        exit 0
    else
        echo -e "\n${RED}Es sind Fehler aufgetreten!${NC}"
        exit 1
    fi
}

# Start der Tests
main 