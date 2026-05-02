type JWTStringValue =
  | `${number}`
  | `${number}s`
  | `${number}m`
  | `${number}h`
  | `${number}d`
  | `${number}w`
  | `${number}y`;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseTokenExpiry(value: string): number | JWTStringValue {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  if (/^\d+(s|m|h|d|w|y)$/.test(value)) {
    return value as JWTStringValue;
  }

  throw new Error(
    `Invalid TOKEN_EXPIRY value: "${value}". Use seconds (3600) or formats like 1h, 7d.`,
  );
}

// runtime-only
export function getServerEnv() {
  return {
    PORT: required("PORT"),
    EMAIL_USER: required("EMAIL_USER"),
    WORK_EMAIL: required("WORK_EMAIL"),
    EMAIL_PASS: required("EMAIL_PASS"),
    SECRET_KEY: required("SECRET_KEY"),
    TOKEN_EXPIRY: parseTokenExpiry(required("TOKEN_EXPIRY")),
    CLIENT_HOST: required("CLIENT_HOST"),
    BACKEND_HOST: required("BACKEND_HOST"),
    MONGO_DB: required("MONGO_DB"),
    MONGODB_URI: required("MONGODB_URI"),
    SESSION_SECRET: required("SESSION_SECRET"),
    NODE_ENV: required("NODE_ENV"),
    ADMIN_DASHBOARD_SECRET: required("ADMIN_DASHBOARD_SECRET"),
    JWT_QR_SIGNING_KEY: required("JWT_QR_SIGNING_KEY"),
    GCP_CLIENT_ID: required("GCP_CLIENT_ID"),
    GCP_CLIENT_SECRET: required("GCP_CLIENT_SECRET"),
    CLOUDINARY_CLOUD_NAME: required("CLOUDINARY_CLOUD_NAME"),
    CLOUDINARY_API_KEY: required("CLOUDINARY_API_KEY"),
    CLOUDINARY_API_SECRET: required("CLOUDINARY_API_SECRET"),
    LOG_LEVEL: required("LOG_LEVEL"),
    SENDGRID_API_KEY: required("SENDGRID_API_KEY"),
    EMAIL_PROVIDER: required("EMAIL_PROVIDER"),
  } as const;
}

// safe for test exports
export const MONGODB_URI = process.env.MONGODB_URI!;
export const NODE_ENV = process.env.NODE_ENV;
export const SESSION_SECRET = process.env.SESSION_SECRET!;
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
export const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER!;

// ----------CHECK WHY THESE ARE EVEN NEEDED IN THE FIRST PLACE---WE SHOULD BE MOCKING IN TESTS
export const SECRET_KEY = process.env.SECRET_KEY!;
export const TOKEN_EXPIRY = parseTokenExpiry(process.env.TOKEN_EXPIRY!);
export const EMAIL_USER = process.env.EMAIL_USER!;
export const EMAIL_PASS = process.env.EMAIL_PASS!;
export const CLIENT_HOST = process.env.CLIENT_HOST!;
export const GCP_CLIENT_ID = process.env.GCP_CLIENT_ID!;
export const GCP_CLIENT_SECRET = process.env.GCP_CLIENT_SECRET!;
export const LOG_LEVEL = process.env.LOG_LEVEL!;
// ---------------------------------------------------------------
