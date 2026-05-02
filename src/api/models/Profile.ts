import { Schema, model, HydratedDocument, Types } from "mongoose";

export interface IProfile {
  userId: Types.ObjectId;

  fullName?: string;
  headline?: string;
  bio?: string;

  photoUrl?: string;

  languages: string[];

  contact?: {
    phone?: string;
  };

  activity: {
    lastActiveAt?: Date;
    profileCompleteness: number;
  };
}

export type ProfileDocument = HydratedDocument<IProfile>;

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user
    },

    fullName: String,
    headline: String,
    bio: String,

    photoUrl: String,

    languages: { type: [String], default: ["ENGLISH"] },

    contact: {
      phone: String,
    },

    activity: {
      lastActiveAt: Date,
      profileCompleteness: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default model<IProfile>("Profile", ProfileSchema);
