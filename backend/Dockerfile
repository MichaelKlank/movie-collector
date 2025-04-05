# Build Stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Installiere Build-Abhängigkeiten
RUN apk add --no-cache gcc musl-dev

# Kopiere zuerst die Go Module Dateien
COPY backend/go.mod backend/go.sum ./

# Download Dependencies
RUN go mod download

# Kopiere den restlichen Quellcode
COPY backend/ .

# Kompiliere die Anwendung
RUN CGO_ENABLED=1 GOOS=linux go build -o main .

# Runtime Stage
FROM alpine:latest

WORKDIR /app

# Kopiere das Binary aus dem Build-Stage
COPY --from=builder /app/main .
# Kopiere die SBOM-Datei
COPY --from=builder /app/sbom.json .

EXPOSE 8080

CMD ["./main"] 