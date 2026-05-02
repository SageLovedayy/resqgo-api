import { getServerEnv } from "../../config/keys.js";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";
import type { UserDocument } from "../models/User.js";

import { SECRET_KEY, TOKEN_EXPIRY } from "../../config/keys.js";

if (!SECRET_KEY) {
  throw new Error("JWT SECRET_KEY is not defined");
}

if (!TOKEN_EXPIRY) throw new Error("JWT TOKEN_EXPIRY is not defined");

export interface AuthTokenPayload {
  _id: string;
  email: string;
  iat?: number; // issued at
  exp?: number; // expires at
}

export function generateToken(user: UserDocument): string {
  const payload: AuthTokenPayload = {
    _id: user._id.toString(),
    email: user.email,
  };

  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRY,
  };

  return jwt.sign(payload, SECRET_KEY as Secret, options);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, SECRET_KEY as Secret) as AuthTokenPayload;
}
