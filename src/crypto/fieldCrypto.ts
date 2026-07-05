import crypto from "node:crypto";
import { env } from "../config/env";

/**
 * Cifrado de campos sensibles a nivel de aplicacion.
 *
 * Se simula "envelope encryption" (como AWS KMS / HashiCorp Vault):
 *  - MASTER_KEK_BASE64 es la Key Encryption Key (KEK), vive solo en el entorno (.env / docker secret),
 *    nunca en el codigo ni en la base de datos.
 *  - Cada valor se cifra con AES-256-GCM usando la KEK directamente como Data Encryption Key para
 *    mantener el ejercicio simple; en un entorno productivo real la KEK cifraria una DEK por
 *    registro/tabla (ver docs/ARQUITECTURA.md, seccion "Evolucion a KMS gestionado").
 *  - GCM entrega autenticidad (AEAD): cualquier alteracion del texto cifrado hace fallar el decrypt.
 *  - Cada operacion usa un IV aleatorio de 12 bytes (nunca reutilizado) y el resultado guardado es
 *    iv || authTag || ciphertext, para poder decifrar sin almacenar estado adicional.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  return Buffer.from(env.MASTER_KEK_BASE64, "base64");
}

export function encryptField(plaintext: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptField(payload: Buffer): string {
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = payload.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** HMAC-SHA256 determinista para permitir busqueda/deduplicacion sin exponer ni poder revertir el PAN. */
export function hmacPan(pan: string): string {
  return crypto.createHmac("sha256", getKey()).update(pan).digest("hex");
}

/** Enmascara un numero de tarjeta dejando visibles solo los ultimos 4 digitos (PCI DSS req. 3.3). */
export function maskPan(pan: string): string {
  const digitsOnly = pan.replace(/\D/g, "");
  const last4 = digitsOnly.slice(-4);
  return `**** **** **** ${last4}`;
}

/** Enmascara un numero de cuenta dejando visibles solo los ultimos 4 caracteres. */
export function maskAccountNumber(accountNumber: string): string {
  const last4 = accountNumber.slice(-4);
  return `${"*".repeat(Math.max(accountNumber.length - 4, 4))}${last4}`;
}
