import { type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import axios from "axios";
import mongoose, { Types } from "mongoose";
import User from "../models/User.js";
import ConsentRecord, { IConsentRecord } from "../models/ConsentRecord.js";
import Profile from "../models/Profile.js";

import { logger } from "../utils/logger.js";
import { ConsentScope } from "../models/consentScope.js";
import Provider from "../models/Provider.js";

interface ConsentScopeInput {
  scopeKey: string;
  granted: boolean;
}

interface ConsentInput {
  consentType: string;
  consentVersion: string;
  consentTextSnapshot: string;
  scopes?: ConsentScopeInput[];
}

const completeMinimalOnboarding: RequestHandler = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      bio,
      headline,
      coords,
      location,
      languages,
      // specialties,
      // subSpecialties,
      // keywords,
      consents,
    } = req.body;

    if (!Array.isArray(consents) || consents.length === 0) {
      return res.status(400).json({ message: "Consents are required" });
    }

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error("User not found");
      if (user.onboardingStatus === "COMPLETED")
        throw new Error("Onboarding already completed");

      const profile = await Profile.findOne({ userId }).session(session);
      if (!profile) throw new Error("Profile not found");

      // Update profile fields
      profile.bio = bio;
      profile.headline = headline;

      if (Array.isArray(languages)) profile.languages = languages;

      await profile.save({ session });

      const provider = await Provider.findOne({ userId }).session(session);
      if (!provider) throw new Error("Provider not found");

      provider.location.coordinates = coords;
      provider.locationName = location;
      // if (Array.isArray(specialties)) profile.specialties = specialties;
      // if (Array.isArray(subSpecialties))
      //   profile.subSpecialties = subSpecialties;
      // if (Array.isArray(keywords)) profile.keywords = keywords;
      const country = location.split(" ")[2];
      // Insert consent records
      for (const c of consents) {
        const consentRecord = new ConsentRecord({
          userId: new Types.ObjectId(userId),
          consentType: c.consentType,
          consentVersion: c.consentVersion,
          consentTextSnapshot: c.consentTextSnapshot,
          acceptedAt: new Date(),
          revokedAt: null,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] || "unknown",
          country,
        });

        await consentRecord.save({ session });

        if (Array.isArray(c.scopes) && c.scopes.length > 0) {
          const scopeDocs = c.scopes.map((s: any) => ({
            consentRecordId: consentRecord._id,
            scopeKey: s.scopeKey,
            granted: s.granted,
          }));

          await ConsentScope.insertMany(scopeDocs, { session });
        }
      }

      user.onboardingStatus = "COMPLETED";
      await user.save({ session });
    });

    return res.status(200).json({
      message: "Onboarding completed successfully",
      onboardingStatus: "COMPLETED",
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({
      message: error.message || "Onboarding failed",
    });
  } finally {
    session.endSession();
  }
};
export { completeMinimalOnboarding };
