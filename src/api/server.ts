import "../config/env.js";
import { getServerEnv } from "../config/keys.js";

import { app } from "./app.js";
import { connectDB } from "../config/db.js";

const { PORT, MONGODB_URI, NODE_ENV } = getServerEnv();

let isConnected = false;

async function startServer() {
  await connectDB(MONGODB_URI);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

async function startVercelServer() {
  if (!isConnected) {
    await connectDB(MONGODB_URI);
    isConnected = true;
    console.log("MongoDB connected (Vercel cold start)");
  }
}

startServer().catch(console.error);

// if (NODE_ENV === "production") {
//   startVercelServer().catch(console.error); //assuming vercel for production for now
// } else {
//   startServer().catch(console.error);
// }
