import { Schema, model, Types } from "mongoose";

export interface IConsentScope {
  consentRecordId: Types.ObjectId;
  scopeKey: string;
  granted: boolean;
}

const ConsentScopeSchema = new Schema<IConsentScope>(
  {
    consentRecordId: {
      type: Schema.Types.ObjectId,
      ref: "ConsentRecord",
      required: true,
      index: true,
    },

    scopeKey: {
      type: String,
      required: true,
    },

    granted: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: false,
  },
);

ConsentScopeSchema.pre("updateOne", () => {
  throw new Error("Consent scopes are immutable");
});

export const ConsentScope = model<IConsentScope>(
  "ConsentScope",
  ConsentScopeSchema,
);
