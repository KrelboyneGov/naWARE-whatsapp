/**
 * AES-GCM for narrative memory and the phone, plus a separate HMAC for lookup.
 * Web Crypto runs on Cloudflare Workers and in Node tests. The ciphertext is not
 * the lookup key: the same number encrypts differently each time and hashes the same.
 */

export interface FieldCipher {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
  hashPhone(e164: string): Promise<string>;
}

export interface FieldCipherKeys {
  /** 32-byte key, base64. */
  encryptionKey: string;
  /** Any non-empty secret distinct from the encryption key. */
  hashKey: string;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function importAes(keyB64: string): Promise<CryptoKey> {
  const raw = b64ToBytes(keyB64);
  if (raw.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes encoded as base64.");
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function createFieldCipher(keys: FieldCipherKeys): FieldCipher {
  if (keys.hashKey.trim() === "") throw new Error("PHONE_HASH_KEY is required.");

  return {
    async encrypt(plaintext: string): Promise<string> {
      const key = await importAes(keys.encryptionKey);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext),
      );
      return `v1.${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
    },

    async decrypt(ciphertext: string): Promise<string> {
      const [version, ivPart, dataPart] = ciphertext.split(".");
      if (version !== "v1" || !ivPart || !dataPart) throw new Error("Unrecognized ciphertext.");
      const key = await importAes(keys.encryptionKey);
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: b64ToBytes(ivPart) },
        key,
        b64ToBytes(dataPart),
      );
      return new TextDecoder().decode(plain);
    },

    async hashPhone(e164: string): Promise<string> {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(keys.hashKey),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(e164));
      return toHex(new Uint8Array(signature));
    },
  };
}

/** 32 zero-free bytes, stable for tests. Not a production secret. */
export const TEST_ENCRYPTION_KEY = bytesToB64(new Uint8Array(32).map((_, i) => i + 1));
export const TEST_HASH_KEY = "test-phone-hash-key";
