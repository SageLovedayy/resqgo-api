import { getServerEnv } from "../../config/keys.js";
import type { UserDocument } from "../models/User.js";

import nodemailer, { type Transporter } from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import crypto from "crypto";

import Profile from "../models/Profile.js";

import { EMAIL_USER, EMAIL_PASS, CLIENT_HOST } from "../../config/keys.js";
import { AppError } from "../errors/AppError.js";
import sendEmail from "../utils/sendEmail.js";
import bcrypt from "bcryptjs";

const transporter: Transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // 587 for STARTTLS, 465 for SSL
  secure: true, // `true` for port 465, `false` for 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

//For external apps
const sendGenEmail = async (
  from: string,
  to: string,
  subject: string,
  message: string,
  type: "text" | "html" = "text",
): Promise<SentMessageInfo> => {
  try {
    const mailOptions =
      type === "text"
        ? { from, to, subject, text: message }
        : { from, to, subject, html: message };

    const info = await transporter.sendMail(mailOptions);
    console.log(`email sent to: ${to}`);
    return info;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
    throw new Error("Failed to send email: unknown error");
  }
};
//Specialized for only password reset
const sendPasswordResetEmail = async (
  userEmail: string,
  resetToken: string,
) => {
  const resetLink = `${CLIENT_HOST}/auth/reset-password?token=${resetToken}`;
  const emailContent = `<p>You requested a password reset. Click below to reset your password:</p>
                        <p><a href="${resetLink}">${resetLink}</a></p>`;

  await sendEmail(userEmail, "Password Reset Request", emailContent);
};

const sendActivationOtp = async (user: UserDocument) => {
  // cooldown
  if (
    user.otpLastSentAt &&
    Date.now() - user.otpLastSentAt.getTime() < 60 * 1000
  ) {
    throw new Error("Please wait before requesting another OTP");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const hashedOtp = await bcrypt.hash(otp, 10);

  user.otpCode = hashedOtp;

  user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otpLastSentAt = new Date();

  await user.save();

  const profile = await Profile.findOne({
    userId: user._id,
  }).select("fullName");

  const displayName = profile?.fullName?.split(" ")[0] ?? "there";

  const emailContent = `
    <p>Hello ${displayName},</p>
    <p>Your verification code is:</p>
    <h2>${otp}</h2>
    <p>This code expires in 10 minutes.</p>
  `;

  await sendEmail(user.email, "Verify your account", emailContent);
};

export { sendEmail, sendPasswordResetEmail, sendGenEmail, sendActivationOtp };
