import { Schema, model, Types } from "mongoose";

export type ConsentType =
  | "PUBLIC_LISTING"
  | "DATA_VERIFICATION"
  | "CROSS_BORDER_STORAGE"
  | "CONTACT_REDIRECTION";

export interface IConsentRecord {
  userId: Types.ObjectId;
  consentType: ConsentType;
  consentVersion: string;
  consentTextSnapshot: string;

  acceptedAt: Date;
  revokedAt: Date | null;

  ipAddress: string;
  userAgent: string;
  country: string;
}

const ConsentRecordSchema = new Schema<IConsentRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    consentType: {
      type: String,
      enum: [
        "PUBLIC_LISTING",
        "DATA_VERIFICATION",
        "CROSS_BORDER_STORAGE",
        "CONTACT_REDIRECTION",
      ],
      required: true,
      index: true,
    },

    consentVersion: { type: String, required: true },

    consentTextSnapshot: { type: String, required: true },

    acceptedAt: { type: Date, required: true },

    revokedAt: { type: Date, default: null, index: true },

    ipAddress: { type: String, required: true },
    userAgent: { type: String, required: true },
    country: { type: String, required: true },
  },
  {
    timestamps: false,
  },
);

ConsentRecordSchema.pre("updateOne", () => {
  throw new Error("Consent records are immutable");
});
ConsentRecordSchema.pre("findOneAndUpdate", () => {
  throw new Error("Consent records are immutable");
});

const ConsentRecord = model<IConsentRecord>(
  "ConsentRecord",
  ConsentRecordSchema,
);

export default ConsentRecord;
