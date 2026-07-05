#!/usr/bin/env bash
# Genera un certificado TLS autofirmado para uso LOCAL del laboratorio (nginx).
# En un entorno productivo real este certificado debe ser emitido por una CA interna/publica,
# nunca autofirmado (ver docs/ARQUITECTURA.md - seccion TLS/PKI).
set -euo pipefail

CERT_DIR="$(dirname "$0")/../docker/nginx/certs"
mkdir -p "$CERT_DIR"

if [[ -f "$CERT_DIR/server.crt" && -f "$CERT_DIR/server.key" ]]; then
  echo "Los certificados ya existen en $CERT_DIR, no se regeneran."
  exit 0
fi

MSYS_NO_PATHCONV=1 openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.crt" \
  -subj "//C=CL/O=GALGO-Lab/OU=Seguridad Informatica/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/server.key"
echo "Certificado autofirmado generado en $CERT_DIR"
