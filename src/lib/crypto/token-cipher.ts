import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.MAILGUARD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MAILGUARD_ENCRYPTION_KEY est absente — le serveur ne peut pas chiffrer/déchiffrer de tokens");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("MAILGUARD_ENCRYPTION_KEY doit décoder vers exactement 32 octets");
  }
  return key;
}

/** Chiffre une chaîne en clair. Sortie : base64(iv || ciphertext || authTag). */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString("base64");
}

/** Déchiffre une valeur produite par encryptToken. Lève si le tag d'authentification est invalide. */
export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Valeur chiffrée invalide : trop courte");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(raw.length - AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH, raw.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
