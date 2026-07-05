import { describe, it, expect } from "vitest";
import { encryptField, decryptField, hmacPan, maskPan, maskAccountNumber } from "../src/crypto/fieldCrypto";

describe("cifrado de campos sensibles (AES-256-GCM)", () => {
  it("cifra y descifra el mismo valor correctamente", () => {
    const original = "6767-2293-4172-5169";
    const encrypted = encryptField(original);
    expect(decryptField(encrypted)).toBe(original);
  });

  it("genera un ciphertext distinto en cada llamada (IV aleatorio)", () => {
    const a = encryptField("mismo-valor");
    const b = encryptField("mismo-valor");
    expect(a.equals(b)).toBe(false);
  });

  it("falla al descifrar si el ciphertext fue alterado (integridad AEAD)", () => {
    const encrypted = encryptField("dato-sensible");
    const tampered = Buffer.from(encrypted);
    tampered[tampered.length - 1] ^= 0xff; // altera el ultimo byte del ciphertext
    expect(() => decryptField(tampered)).toThrow();
  });

  it("el hash HMAC del PAN es determinista (permite deduplicar sin exponer el dato)", () => {
    const pan = "6767-2293-4172-5169";
    expect(hmacPan(pan)).toBe(hmacPan(pan));
    expect(hmacPan(pan)).not.toBe(hmacPan("otro-numero"));
  });
});

describe("enmascarado de datos sensibles", () => {
  it("solo deja visibles los ultimos 4 digitos de la tarjeta", () => {
    expect(maskPan("6767-2293-4172-5169")).toBe("**** **** **** 5169");
  });

  it("solo deja visibles los ultimos 4 caracteres del numero de cuenta", () => {
    expect(maskAccountNumber("50099904")).toBe("****9904");
  });
});
