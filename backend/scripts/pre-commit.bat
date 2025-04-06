@echo off
echo Running pre-commit checks on Windows...

REM Linter ausführen
echo Running golangci-lint...
golangci-lint run
if errorlevel 1 (
    echo ❌ Linting failed. Please fix the issues before committing.
    exit /b 1
)

REM Tests ausführen
echo Running tests...
go test ./... -v
if errorlevel 1 (
    echo ❌ Tests failed. Please fix the failing tests before committing.
    exit /b 1
)

echo ✅ All checks passed!
exit /b 0 