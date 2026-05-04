import express from "express";
import session from "express-session";
import cors from "cors";
import cookieParser from "cookie-parser";

// Routes
import authRoutesV1 from "./routes/v1/authRoutes.js";
// import profileRoutesV1 from "./routes/v1/profileRoutes.js";
import providerRoutesV1 from "./routes/v1/provider.routes.js";

// Config
import mongoStore from "../config/sessionStore.js";
import limiter from "./middleware/rateLimiter.js";

import { SESSION_SECRET, NODE_ENV } from "../config/keys.js";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";

export const app = express();

const allowedOrigins = [
  "127.0.0.1",
  "http://localhost:3000",
  "https://health-directory-web.vercel.app",
];

app.use(express.json());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: mongoStore,
    cookie: {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

// RATELIMITING========
app.use(limiter);

// Routes
app.use("/api/v1/auth", authRoutesV1);
// app.use("/api/v1/profile", profileRoutesV1);
app.use("/api/v1/providers", providerRoutesV1);

app.use(globalErrorHandler);

export default app;
