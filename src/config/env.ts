import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

console.log(`[env] Loading environment variables from ${envFile}`);

dotenv.config({ path: envFile });
