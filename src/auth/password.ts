import argon2 from "argon2";

// Argon2id: ganador del Password Hashing Competition, recomendado por OWASP sobre bcrypt/PBKDF2
// para nuevos desarrollos. Parametros por encima del minimo OWASP (m=19MiB) para mayor resistencia.
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
