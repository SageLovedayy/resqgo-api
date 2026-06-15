import { Schema, model, HydratedDocument, Types } from "mongoose";

export type ServiceType =
  | "autoRepair"
  | "towing"
  | "fuelDelivery"
  | "insurance";

export interface IProvider {
  userId: Types.ObjectId;

  businessName: string;
  phoneNumber: string;

  services: ServiceType[];
  charges: {
    autoRepair?: number;
    towing?: number;
    fuelDelivery?: number;
    insurance?: number;
  };

  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };

  locationName?: {
    city: string;
    country: string;
  };

  available: boolean;

  engagement: {
    avgRating: number;
    reviews: number;
  };

  business: {
    featured: boolean;
    featuredUntil?: Date;
  };
}

export type ProviderDocument = HydratedDocument<IProvider>;

const ProviderSchema = new Schema<IProvider>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one provider per user
      index: true,
    },

    businessName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },

    services: [
      {
        type: String,
        enum: ["autoRepair", "towing", "fuelDelivery", "insurance"],
      },
    ],

    charges: {
      autoRepair: Number,
      towing: Number,
      fuelDelivery: Number,
      insurance: Number,
    },

    available: { type: Boolean, default: false },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    locationName: { country: { type: String }, city: { type: String } },

    engagement: {
      avgRating: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
    },

    business: {
      featured: { type: Boolean, default: false },
      featuredUntil: Date,
    },
  },
  { timestamps: true },
);

ProviderSchema.index({ location: "2dsphere" });

export default model<IProvider>("Provider", ProviderSchema);
