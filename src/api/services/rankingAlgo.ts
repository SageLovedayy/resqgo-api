import Profile, { IProfile } from "../models/Profile.js";
import User, { IUser } from "../models/User.js";
import ConsentRecord from "../models/ConsentRecord.js";
import { logger } from "../utils/logger.js";
import { RANKING_WEIGHTS } from "../constants/rankingweights.js";

export interface FilterOptions {
  query?: string;
  country?: string;
  city?: string;
  specialties?: string[];
  available?: boolean;
  languages?: string[];
  keywords?: string[];
}

interface ProfileWithUser {
  profile: IProfile;
  user: IUser;
}

export async function getEligibleProfiles(
  options: FilterOptions,
): Promise<ProfileWithUser[]> {
  const profileFilter: any = {
    // Required credentials are present
    // "credentials.identityVerified": true,
    // "credentials.licenseVerified": true,
  };

  if (options.country) profileFilter["location.country"] = options.country;
  if (options.city) profileFilter["location.city"] = options.city;
  if (options.available) profileFilter["available"] = options.available;
  if (options.specialties)
    profileFilter["specialties"] = { $in: options.specialties };
  if (options.languages)
    profileFilter["languages"] = { $in: options.languages };

  if (options.query) {
    const regex = new RegExp(options.query, "i");
    profileFilter["$or"] = [
      { fullName: regex },
      { headline: regex },
      { bio: regex },
      { specialties: regex },
      { subSpecialties: regex },
      { keywords: regex },
      { languages: regex },
    ];
  }

  const profiles = await Profile.find(profileFilter)
    .select(
      "_id userId fullName headline bio photoUrl contact specialties subSpecialties keywords location credentials activity engagement business available languages",
    )
    .lean();

  logger.debug(
    { count: profiles.length, profileIds: profiles.map((p) => p._id) },
    "Selected profiles from Eligibility filter",
  );

  if (profiles.length === 0) return [];

  const userIds = profiles.map((p) => p.userId);

  const userFilter: any = {
    _id: { $in: userIds },
    status: "ACTIVE",
    flagged: false,
  };

  const users = await User.find(userFilter).select("_id status flagged").lean();

  const usersMap = new Map(users.map((u) => [u._id.toString(), u]));

  if (usersMap.size === 0) return [];

  const consents = await ConsentRecord.find({
    userId: { $in: Array.from(usersMap.keys()) },
    consentType: "PUBLIC_LISTING",
    revokedAt: null,
  })
    .select("userId revokedAt")
    .lean();

  const consentsMap = new Map(
    consents.map((consent) => [consent.userId.toString(), consent]),
  );
  //combine profiles wiht users and filter by consent -
  const eligibleProfiles: ProfileWithUser[] = [];

  for (const profile of profiles) {
    const userId = profile.userId.toString();

    const user = usersMap.get(userId);
    if (!user) continue;

    const consent = consentsMap.get(userId);
    if (!consent) continue;

    eligibleProfiles.push({ profile, user });
  }

  return eligibleProfiles;
}

// 5. Scoring Model Overview
// Each eligible profile receives a score composed of weighted components:
// FinalScore =
//   RelevanceScore
// + TrustScore
// + ActivityScore
// + EngagementScore
// + BusinessScore
const SCORE_CAPS = { relevance: 60, trust: 60, activity: 30, engagement: 30 };

function getRelevanceScore(profile: IProfile, query: FilterOptions): number {
  let score = 0;

  if (query.specialties?.length) {
    for (const specialty of query.specialties) {
      if (profile.specialties?.includes(specialty)) score += 40;
      else if (profile.subSpecialties?.includes(specialty)) score += 20;
    }
  }

  if (query.keywords?.length) {
    for (const keyword of query.keywords) {
      if (
        profile.fullName?.includes(keyword) ||
        profile.bio?.includes(keyword) ||
        profile.keywords?.includes(keyword)
      ) {
        score += 10;
      }
    }
  }

  if (query.city && query.city === profile.location.city) score += 10;
  if (query.country && query.country === profile.location.country) score += 5;

  return Math.min(score, SCORE_CAPS.relevance);
}

function getTrustScore(profile: IProfile): number {
  let score = 0;

  const c = profile.credentials;

  if (c.identityVerified) score += 15;
  if (c.licenseVerified) score += 25;
  if (c.institutionAffiliation) score += 10;
  if (c.yearsOfExperience ?? 0 > 10) score += 10;

  logger.debug({ c, score }, "Profile credentials");

  return Math.min(score, SCORE_CAPS.trust);
}

function getActivityScore(profile: IProfile, now = new Date()): number {
  let score = 0;

  const a = profile.activity;

  if (a.profileCompleteness > 90) score += 10;

  if (!a.lastActiveAt) return score;

  const daysAgo =
    (now.getTime() - a.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysAgo <= 7) score += 10;
  else if (daysAgo <= 30) score += 5;

  return Math.min(score, SCORE_CAPS.activity);
}

function getEngagementScore(profile: IProfile): number {
  const normalize = (value: number, max: number = 100) => {
    return Math.min(value / max, 1);
    //return a value between 0, and 1
  };

  const profileViews = normalize(profile.engagement.views, 1000) * 10;
  const bookmarks = normalize(profile.engagement.bookmarks, 200) * 10;
  const contacts = normalize(profile.engagement.contacts, 100) * 100;

  const score = profileViews + bookmarks + contacts;

  return Math.min(score, SCORE_CAPS.engagement);
}

//For featured profiles
function getBusinessScore(profile: IProfile, trustScore: number): number {
  let score = 0;
  if (!profile.business.featured) return score;

  const now = new Date();

  if (profile.business.featuredUntil && profile.business.featuredUntil < now)
    return score;

  //hard capped value
  return Math.min(10, trustScore);
}

// This would use preset weights to calculate score
export function rankProfilesByFinalScore(
  eligibleProfiles: ProfileWithUser[],
  query: FilterOptions,
): RankedProfiles[] {
  logger.debug({ eligibleProfiles }, "Eligible from function");

  const ranked = eligibleProfiles
    .map((p) => {
      const relevanceScore = getRelevanceScore(p.profile, query);
      const trustScore = getTrustScore(p.profile);
      const activityScore = getActivityScore(p.profile);
      const engagementScore = getEngagementScore(p.profile);

      const relevance = relevanceScore * RANKING_WEIGHTS.relevance;
      const trust = trustScore * RANKING_WEIGHTS.trust;
      const activity = activityScore * RANKING_WEIGHTS.activity;
      const engagement = engagementScore * RANKING_WEIGHTS.engagement;

      const baseScore = relevance + trust + activity + engagement;

      const businessScore = getBusinessScore(p.profile, relevance + trust);

      const business = businessScore * RANKING_WEIGHTS.business;

      const finalScore = baseScore + business;

      return {
        profile: p.profile,
        score: finalScore,
        scoreBreakDown: {
          relevance,
          trust,
          activity,
          engagement,
          business,
        },
      };
    })
    .sort((a, b) => b.score - a.score);

  return ranked;
}

// COordinator function

interface RankedProfiles {
  profile: IProfile;
  score: number;
  scoreBreakDown: {
    relevance: number;
    trust: number;
    activity: number;
    engagement: number;
    business: number;
  };
}

export async function getRankedProfiles(
  options: FilterOptions,
): Promise<RankedProfiles[]> {
  const eligibleProfiles = await getEligibleProfiles(options);
  logger.debug({ eligibleProfiles }, "elgibile from TOp LEvel");
  if (!eligibleProfiles.length) return [];

  const rankedProfiles = rankProfilesByFinalScore(eligibleProfiles, options);
  logger.debug({ rankedProfiles }, "Ranked Profiles");
  return rankedProfiles;
}

export async function getProfiles(options: FilterOptions): Promise<IProfile[]> {
  const rankedProfiles = await getRankedProfiles(options);
  return rankedProfiles.map((r) => r.profile);
}
