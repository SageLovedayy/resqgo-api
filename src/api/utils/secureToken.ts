import crypto from "crypto";
import bcrypt from "bcryptjs";

//FOR GENERATING AND HASHING SECURE TOKENS (E.G., PASSWORD RESET TOKENS)

function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function hashToken(raw: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(raw, saltRounds);
}

async function verifyToken(raw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(raw, hash);
}

export { generateRawToken, hashToken, verifyToken };

//TODO: switch hashing to HMAC (faster than bcrypt for tokens)
