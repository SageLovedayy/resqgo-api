import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";

import Profile from "../api/models/Profile.js";
import User from "../api/models/User.js";
import ConsentRecord from "../api/models/ConsentRecord.js";

import { getEligibleProfiles } from "../api/services/rankingAlgo.js";

describe("getEligibleProfiles", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      ConsentRecord.deleteMany({}),
    ]);
  });

  it("returns only profiles with active users and active PUBLIC_LISTING consent", async () => {
    // --- Create users ---
    const activeUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: "active@example.com",
      status: "ACTIVE",
      flagged: false,
    });

    const inactiveUser = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: "inactive@example.com",
      status: "SUSPENDED",
      flagged: false,
    });

    // --- Create profiles ---
    const activeProfile = await Profile.create({
      userId: activeUser._id,
      credentials: { identityVerified: true, licenseVerified: true },
      specialties: ["Digital Health Advocacy"],
      location: { country: "Nigeria" },
    });

    const inactiveProfile = await Profile.create({
      userId: inactiveUser._id,
      credentials: { identityVerified: true, licenseVerified: true },
      specialties: ["Digital Health Advocacy", "Telemedicine"],
      location: { country: "Nigeria" },
    });

    // --- Create consents ---
    await ConsentRecord.create({
      userId: activeUser._id,
      consentType: "PUBLIC_LISTING",
      consentVersion: "v1",
      consentTextSnapshot: "I consent",
      acceptedAt: new Date(),
      revokedAt: null,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      country: "NG",
      signatureName: "Dr Active",
    });

    await ConsentRecord.create({
      userId: inactiveUser._id,
      consentType: "PUBLIC_LISTING",
      consentVersion: "v1",
      consentTextSnapshot: "I consent",
      acceptedAt: new Date(),
      revokedAt: null,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      country: "NG",
      signatureName: "Dr Inactive",
    });

    const eligible = await getEligibleProfiles({
      country: "Nigeria",
      specialty: "Digital Health Advocacy",
    });

    expect(eligible.length).toBe(1);
    expect(eligible[0].profile.userId.toString()).toBe(
      activeUser._id.toString(),
    );
  });

  it("excludes profiles with revoked consent", async () => {
    const user = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: "user@example.com",
      status: "ACTIVE",
      flagged: false,
    });

    await Profile.create({
      userId: user._id,
      credentials: { identityVerified: true, licenseVerified: true },
      specialties: ["Cardiology"],
      location: { country: "Nigeria", city: "Warri" },
    });

    await ConsentRecord.create({
      userId: user._id,
      consentType: "PUBLIC_LISTING",
      consentVersion: "v1",
      consentTextSnapshot: "I consent",
      acceptedAt: new Date(),
      revokedAt: new Date(), // revoked
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      country: "NG",
      signatureName: "Dr Revoked",
    });

    const eligible = await getEligibleProfiles({
      country: "Nigeria",
      city: "Warri",
      specialty: "Cardiology",
    });

    expect(eligible.length).toBe(0);
  });

  it("excludes profiles with missing credentials", async () => {
    const user = await User.create({
      _id: new mongoose.Types.ObjectId(),
      email: "user@example.com",
      status: "ACTIVE",
      flagged: false,
    });

    await Profile.create({
      userId: user._id,
      credentials: { identityVerified: false, licenseVerified: true },
      specialties: ["Cardiology"],
      location: { country: "Nigeria" },
    });

    await ConsentRecord.create({
      userId: user._id,
      consentType: "PUBLIC_LISTING",
      consentVersion: "v1",
      consentTextSnapshot: "I consent",
      acceptedAt: new Date(),
      revokedAt: null,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      country: "NG",
      signatureName: "Dr MissingCred",
    });

    const eligible = await getEligibleProfiles({
      country: "Nigeria",
      city: "Warri",
      specialty: "Cardiology",
    });

    expect(eligible.length).toBe(0);
  });
});

describe("getEligibleProfiles - multiple users", () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      ConsentRecord.deleteMany({}),
    ]);
  });
  it("returns only profiles with active users, verified credentials, and active PUBLIC_LISTING consent", async () => {
    const usersData = [
      { email: "active1@example.com", status: "ACTIVE", flagged: false },
      { email: "active2@example.com", status: "ACTIVE", flagged: false },
      { email: "inactive@example.com", status: "SUSPENDED", flagged: false },
      { email: "flagged@example.com", status: "ACTIVE", flagged: true },
      { email: "active3@example.com", status: "ACTIVE", flagged: false },
      { email: "active4@example.com", status: "ACTIVE", flagged: false },
    ];

    const users = await Promise.all(
      usersData.map((data) =>
        User.create({ _id: new mongoose.Types.ObjectId(), ...data }),
      ),
    );

    const profilesData = [
      {
        userId: users[0]._id,
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria", city: "Warri" },
        languages: ["ENGLISH"],
      },
      {
        userId: users[1]._id,
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria" },
      },
      {
        userId: users[2]._id, // inactive user
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria" },
      },
      {
        userId: users[3]._id, // flagged user
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria" },
      },
      {
        userId: users[4]._id,
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria", city: "Warri" },
        languages: ["SPANISH"],
      },
      {
        userId: users[5]._id,
        credentials: { identityVerified: true, licenseVerified: true },
        specialties: ["Digital Health Advocacy"],
        location: { country: "Nigeria", city: "Warri" },
        languages: ["ENGLISH", "SPANISH"],
      },
    ];

    await Promise.all(profilesData.map((p) => Profile.create(p)));

    // --- Create consents ---
    const consentsData = [
      { userId: users[0]._id, revoked: false },
      { userId: users[1]._id, revoked: false },
      { userId: users[2]._id, revoked: false },
      { userId: users[3]._id, revoked: true }, // flagged, revoked
      { userId: users[4]._id, revoked: false },
      { userId: users[5]._id, revoked: false },
    ];

    await Promise.all(
      consentsData.map((c) =>
        ConsentRecord.create({
          userId: c.userId,
          consentType: "PUBLIC_LISTING",
          consentVersion: "v1",
          consentTextSnapshot: "I consent",
          acceptedAt: new Date(),
          revokedAt: c.revoked ? new Date() : null,
          ipAddress: "127.0.0.1",
          userAgent: "vitest",
          country: "NG",
          signatureName: "Dr Test",
        }),
      ),
    );

    // --- Call function ---
    const eligible = await getEligibleProfiles({
      country: "Nigeria",
      city: "Warri",
      specialty: "Digital Health Advocacy",
      languages: ["ENGLISH", "SPANISH"],
    });

    // --- Assertions ---
    expect(eligible.length).toBe(3);
    const eligibleEmails = eligible.map((e) => e.profile.userId.toString());
    expect(eligibleEmails).toContain(users[0]._id.toString());
    expect(eligibleEmails).toContain(users[4]._id.toString());
    expect(eligibleEmails).toContain(users[5]._id.toString());
    expect(eligibleEmails).not.toContain(users[1]._id.toString());
    expect(eligibleEmails).not.toContain(users[2]._id.toString());
    expect(eligibleEmails).not.toContain(users[3]._id.toString());
    // expect(eligible.length).toBe(2); // only active1 and active2
    // const eligibleEmails = eligible.map((e) => e.profile.userId.toString());
    // expect(eligibleEmails).toContain(users[0]._id.toString());
    // expect(eligibleEmails).toContain(users[1]._id.toString());
    // expect(eligibleEmails).not.toContain(users[2]._id.toString());
    // expect(eligibleEmails).not.toContain(users[3]._id.toString());
  });
});
