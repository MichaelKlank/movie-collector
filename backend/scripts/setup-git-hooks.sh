#!/bin/bash

# Verzeichnis für Hooks erstellen
mkdir -p ../.git/hooks

# Unix-Skript kopieren
cp "$(dirname "$0")/pre-commit" ../.git/hooks/pre-commit
chmod +x ../.git/hooks/pre-commit

# Windows-Skript kopieren
cp "$(dirname "$0")/pre-commit.bat" ../.git/hooks/pre-commit.bat

echo "Git hooks installed successfully in the root repository!" 