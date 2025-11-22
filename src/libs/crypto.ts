import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "nostr-tools/utils";
import CryptoJS from "crypto-js";

export function generateEphemeralKeys(): {
  privateKey: Uint8Array;
  publicKey: string;
} {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);

  return { privateKey, publicKey };
}

export function generateBoardId(): string {
  const boardId = bytesToHex(generateSecretKey());
  return boardId;
}

// Encrypt text with password
export function encryptNwc(text: string, password: string): string {
  return CryptoJS.AES.encrypt(text, password).toString();
}

// Decrypt text with password
export function decryptNwc(ciphertext: string, password: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error();
    return decrypted;
  } catch {
    throw new Error("Failed to decrypt, maybe wrong password");
  }
}
