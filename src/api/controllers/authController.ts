import { type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";

import User from "../models/User.js";
import { generateToken, verifyToken } from "../utils/jwtTokenHandler.js";

import {
  sendActivationOtp,
  sendPasswordResetEmail,
} from "../services/emailService.js";
import { hashToken, generateRawToken } from "../utils/secureToken.js";

import Profile from "../models/Profile.js";

import {
  GCP_CLIENT_ID,
  GCP_CLIENT_SECRET,
  CLIENT_HOST,
} from "../../config/keys.js";
import { logger } from "../utils/logger.js";

const signup: RequestHandler = async (req, res, next) => {
  const { email, password, fullName, role } = req.body;

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(400).json({ message: "Account already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: role === "PROVIDER" ? "PROVIDER" : "USER",
      status: "PENDING_ACTIVATION",
      onboardingStatus: "PENDING",
    });

    await Profile.create({
      userId: user._id,
      fullName,
      languages: ["ENGLISH"],
      activity: {
        profileCompleteness: 10,
      },
    });

    await sendActivationOtp(user);

    return res.status(201).json({
      userId: user._id,
      email: user.email,
      role: user.role,
      requiredOnboarding: true,
      message: "Check email to activate account",
    });
  } catch (err) {
    next(err);
  }
};

const resendOtp: RequestHandler = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    if (user.status === "ACTIVE") {
      return res.status(400).json({
        message: "Account already verified",
      });
    }

    await sendActivationOtp(user);

    return res.json({
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("OTP resend error:", err);
    next(err);
  }
};

const verifyOtp: RequestHandler = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      message: "OTP is required",
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({
        message: "Invalid request",
      });
    }

    // blocked
    if (user.otpBlockedUntil && user.otpBlockedUntil > new Date()) {
      return res.status(429).json({
        message: "Too many attempts. Try again later.",
      });
    }

    // expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const isValid = await bcrypt.compare(otp, user.otpCode);

    // invalid OTP
    if (!isValid) {
      user.otpAttempts += 1;

      if (user.otpAttempts >= 5) {
        user.otpBlockedUntil = new Date(Date.now() + 15 * 60 * 1000);

        user.otpAttempts = 0;
      }

      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    // success
    user.status = "ACTIVE";

    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.otpBlockedUntil = undefined;

    await user.save();

    return res.json({
      message: "Account verified",
    });
  } catch (err) {
    console.error("Activation error:", err);
    next(err);
  }
};

const login: RequestHandler = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({ message: "Access restricted" });
    }

    if (user.status === "PENDING_ACTIVATION") {
      await sendActivationOtp(user);

      return res.status(200).json({
        requiresOtpVerification: true,
        email: user.email,
        message: "Activate your account. Verification code sent.",
      });
    }

    const profile = await Profile.findOne({ userId: user._id });

    const token = generateToken(user);

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        onboardingStatus: user.onboardingStatus,
        fullName: profile?.fullName ?? null,
      },
      accessToken: token,
    });
  } catch (err) {
    next(err);
  }
};

const loginOAuth: RequestHandler = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Authorization code required" });
  }

  try {
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: GCP_CLIENT_ID,
        client_secret: GCP_CLIENT_SECRET,
        redirect_uri: `${CLIENT_HOST}/auth/oauth/callback`,
      }),
    );

    const { id_token } = tokenRes.data;
    const googleUser = jwt.decode(id_token) as any;

    if (!googleUser?.email) {
      return res.status(400).json({ message: "Google auth failed" });
    }

    const email = googleUser.email;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        role: "USER", // default safe role
        status: "ACTIVE",
        onboardingStatus: "PENDING",
        passwordHash: null,
      });

      await Profile.create({
        userId: user._id,
        fullName: googleUser.name,
      });
    }

    const token = generateToken(user);

    return res.json({
      email: user.email,
      role: user.role,
      accessToken: token,
      onboardingStatus: user.onboardingStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OAuth login failed" });
  }
};

const refreshToken: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token required" });

  try {
    const decoded = verifyToken(refreshToken);
    const user = await User.findById(decoded._id);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const token = generateToken(user);

    res.json({ accessToken: token });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

const requestPasswordReset: RequestHandler = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = generateRawToken();
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1hr
    await user.save();

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

const resetPassword: RequestHandler = async (req, res, next) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    next();
  }
};

const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(userId).select(
      "email role onboardingStatus status",
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export {
  signup,
  verifyOtp,
  login,
  loginOAuth,
  refreshToken,
  requestPasswordReset,
  resetPassword,
  resendOtp,
  getCurrentUser,
};
