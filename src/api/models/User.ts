import { Schema, model, HydratedDocument } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string | null;

  role: "USER" | "PROVIDER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_ACTIVATION";

  flagged: boolean;
  onboardingStatus: "PENDING" | "COMPLETED";

  otpCode?: string | null;
  otpExpiry?: Date | null;
  otpAttempts: number;
  otpBlockedUntil?: Date;
  otpLastSentAt?: Date | null;

  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["USER", "PROVIDER", "ADMIN"],
      default: "USER",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING_ACTIVATION"],
      default: "PENDING_ACTIVATION",
    },

    flagged: { type: Boolean, default: false },

    onboardingStatus: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },

    otpCode: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    otpLastSentAt: { type: Date, default: null },

    otpBlockedUntil: { type: Date, default: null },

    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

export default model<IUser>("User", userSchema);
