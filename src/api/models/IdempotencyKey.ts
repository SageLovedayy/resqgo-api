import { Schema, model } from "mongoose";

const IdempotencyKeySchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    requestHash: { type: String, required: true },
    response: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

IdempotencyKeySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 }, // 24 hours
);

export const IdempotencyKey = model("IdempotencyKey", IdempotencyKeySchema);
