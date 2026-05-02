import { Schema, model, HydratedDocument } from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string | null;

  role: "USER" | "PROVIDER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "PENDING_ACTIVATION";

  flagged: boolean;
  onboardingStatus: "PENDING" | "COMPLETED";

  activationToken?: string | null;
  activationTokenExpiry?: Date | null;

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

    activationToken: { type: String, default: null },
    activationTokenExpiry: { type: Date, default: null },

    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

export default model<IUser>("User", userSchema);