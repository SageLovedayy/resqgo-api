import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 0.5 * 60 * 1000,
  // windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

export const limiter_tests = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
});

export default limiter;
