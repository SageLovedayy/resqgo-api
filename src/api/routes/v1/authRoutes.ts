import express from "express";
import { body } from "express-validator";

import {
  signup,
  login,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  loginOAuth,
  verifyOtp,
  resendOtp,
} from "../../controllers/authController.js";

import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import idempotency from "../../middleware/idempotency.js";

const router = express.Router();

router.post(
  "/signup",
  [
    body("email").isEmail(),
    body("password").isString().isLength({ min: 6 }),
    body("fullName").isString().notEmpty(),
  ],
  validateRequest,
  idempotency,
  signup,
); /// TODO: Add test for idemptotency

router.post("/verify-account", verifyOtp);
router.post("/resend-otp", resendOtp);

router.post(
  "/login",
  [body("email").isEmail(), body("password").isString().notEmpty()],
  login,
);

// ===EXPERIMENTAL===
router.post(
  "/oauth/google/login",
  [body("code").isString().notEmpty()],
  loginOAuth,
);

//TODO: Add refreshToken route here-----

router.post(
  "/request-reset",
  [body("email").isString().notEmpty()],
  requestPasswordReset,
);

router.post(
  "/reset-password",
  [
    body("token").isString().notEmpty(),
    body("newPassword").isString().isLength({ min: 6 }),
  ],
  resetPassword,
);

router.get("/me", auth, getCurrentUser);

router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend is alive 🚀",
    timestamp: new Date().toISOString(),
  });
});

export default router;
