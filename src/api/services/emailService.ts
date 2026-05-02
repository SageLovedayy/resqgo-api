import { getServerEnv } from "../../config/keys.js";
import type { UserDocument } from "../models/User.js";

import nodemailer, { type Transporter } from "nodemailer";
import type { SentMessageInfo } from "nodemailer";
import crypto from "crypto";

import Profile from "../models/Profile.js";

import { EMAIL_USER, EMAIL_PASS, CLIENT_HOST } from "../../config/keys.js";
import { AppError } from "../errors/AppError.js";
import sendEmail from "../utils/sendEmail.js";

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

const sendActivationEmail = async (user: UserDocument): Promise<void> => {
  const activationToken = crypto.randomBytes(32).toString("hex");

  user.activationToken = activationToken;
  user.activationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours
  await user.save();

  // Fetch profile for name (non-blocking)
  const profile = await Profile.findOne({ userId: user._id }).select(
    "fullName",
  );

  const displayName = profile?.fullName?.split(" ")[0] ?? "there";

  const activationLink = `${CLIENT_HOST}/auth/activate-account/${activationToken}`;

  const emailContent = `
    <p>Hello ${displayName},</p>
    <p>Thanks for signing up! Please click below to activate your account:</p>
    <p><a href="${activationLink}">Activate Account</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;

  await sendEmail(user.email, "Activate Your Account", emailContent);
};

export { sendEmail, sendPasswordResetEmail, sendGenEmail, sendActivationEmail };
