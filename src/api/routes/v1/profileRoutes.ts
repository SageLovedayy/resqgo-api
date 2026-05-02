import express, { Request, Response } from "express";
import { body } from "express-validator";

import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import idempotency from "../../middleware/idempotency.js";
import { completeMinimalOnboarding } from "../../controllers/profileController.js";
import onboardingValidation from "../../middleware/onboardingValidation.js";
import Profile from "../../models/Profile.js";
import { logger } from "../../utils/logger.js";
import { FilterOptions, getProfiles } from "../../services/rankingAlgo.js";
import multer from "multer";
import cloudinary from "../../../config/cloudinary.js";

import fs from "fs/promises";
import Provider from "../../models/Provider.js";

const router = express.Router();

const upload = multer({ dest: "tmp/" });

const uploadImage = async (
  req: Request,
  res: Response,
  successMessage: string,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    if (!req?.user?._id)
      return res.status(403).json({ message: "Unauthorized" });
    const id = req.user._id; // the authenticated user

    const user = await Profile.findOne({ userId: id });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "dha-directory/profile_images",
      allowed_formats: ["jpg", "jpeg", "png"],
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    });

    // Remove temporary local file
    await fs.unlink(req.file.path);

    // Save Cloudinary URL to MongoDB
    user.photoUrl = result.secure_url;
    await user.save();

    res.status(200).json({
      message: successMessage,
      photoUrl: user.photoUrl,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ message: "An unexpected error occurred" });
  }
};

router.post(
  "/onboarding/minimal",
  auth,
  onboardingValidation,
  validateRequest,
  idempotency,
  completeMinimalOnboarding,
);

router.post(
  "/img/:type?",
  auth,
  upload.single("profile_image"), // handle single file upload
  async (req, res) => {
    await uploadImage(req, res, "Profile image updated successfully");
  },
);

// router.post("/image/:type?", auth, async (req, res, next) => {
//   const { type = "profile" } = req.params;
//   const imageConfig = {
//     profile: {
//       field: "profile_image",
//       message: "Profile image updated successfully",
//     },
//     cover: {
//       field: "cover_photo",
//       message: "Cover photo updated successfully",
//     },
//     avatar: {
//       field: "avatar_image",
//       message: "Avatar image updated successfully",
//     },
//   };

//   const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//       folder: `${
//         type === "cover"
//           ? "dha-directory/cover_photos"
//           : "dha-directory/profile_images"
//       }`, // Cloudinary folder name
//       allowed_formats: ["jpg", "jpeg", "png"],
//       transformation: [{ width: 500, height: 500, crop: "limit" }],
//     },
//   });

//   const upload = multer({ storage });

//   const config = imageConfig[type];
//   console.log("type: ", type, "config: ", config);
//   if (!config) {
//     return res.status(400).json({ message: "Invalid image type" });
//   }

//   upload.single(config.field)(req, res, (err) => {
//     console.error(err);
//     if (err) return res.status(500).json({ message: "Image upload error" });
//     uploadImage(req, res, config.field, config.message);
//   });
// });

router.get("/all", async (req, res, next) => {
  try {
    const {
      query,
      country,
      city,
      specialties,
      available,
      languages,
      keywords,
      page,
      limit,
    } = req.query;

    /* ==========================================
       NORMALIZE ARRAY QUERY PARAMS
    ========================================== */

    const normalizeToStringArray = (value: unknown): string[] | undefined => {
      if (!value) return undefined;

      if (typeof value === "string") {
        return value.split(",").map((v) => v.trim());
      }

      if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string");
      }

      return undefined;
    };

    /* ==========================================
       BUILD FILTER OPTIONS
    ========================================== */

    const options: FilterOptions = {
      query: typeof query === "string" ? query : undefined,
      country: typeof country === "string" ? country : undefined,
      city: typeof city === "string" ? city : undefined,
      specialties: normalizeToStringArray(specialties),
      available:
        typeof available === "string" ? available === "true" : undefined,
      languages: normalizeToStringArray(languages),
      keywords: normalizeToStringArray(keywords),
    };

    /* ==========================================
       PAGINATION PARAMS
    ========================================== */

    const currentPage =
      typeof page === "string" && !isNaN(Number(page))
        ? Math.max(Number(page), 1)
        : 1;

    const pageSize =
      typeof limit === "string" && !isNaN(Number(limit))
        ? Math.max(Number(limit), 1)
        : 10; // default 10 per page

    /* ==========================================
       FETCH & RANK PROFILES
    ========================================== */

    const rankedProfiles = await getProfiles(options);

    const totalProfiles = rankedProfiles.length;
    const totalPages = Math.ceil(totalProfiles / pageSize);

    /* ==========================================
       SLICE RESULTS
    ========================================== */

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const profiles = rankedProfiles.slice(startIndex, endIndex);

    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;

    return res.status(200).json({
      profiles,
      meta: {
        currentPage,
        totalPages,
        totalProfiles,
        hasPrevPage,
        hasNextPage,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", auth, async (req, res, next) => {
  const userId = req?.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const profile = await Profile.findOne({ userId }).select(
    "fullName headline bio specialties subSpecialties keywords languages credentials actvity engagement location photoUrl contact",
  );
  console.log("profile: ", profile);
  logger.debug({ profile }, "profile");
  if (!profile) return res.status(404).json({ message: "Profile not found" });

  return res.status(200).json({ profile });
});

router.patch("/", auth, async (req, res, next) => {
  try {
    const userId = req?.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const provider = await Provider.findOne({ userId });
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const restrictedFields = [
      "fullName",
      "credentials",
      "activity",
      "engagement",
    ];

    const allowedFields = [
      "headline",
      "bio",
      "specialties",
      "subSpecialties",
      "keywords",
      "languages",
      "location",
      "photoUrl",
      "contact",
    ];

    const updates: any = {};

    for (const key of Object.keys(req.body)) {
      if (restrictedFields.includes(key)) continue;
      if (!allowedFields.includes(key)) continue;

      // ===============================
      // ARRAY FIELDS
      // ===============================
      if (
        ["specialties", "subSpecialties", "keywords", "languages"].includes(key)
      ) {
        if (!Array.isArray(req.body[key])) {
          return res.status(400).json({ message: `${key} must be an array` });
        }

        updates[key] = req.body[key];
      }

      // ===============================
      // LOCATION OBJECT
      // ===============================
      else if (key === "location") {
        if (typeof req.body.location !== "object") {
          return res
            .status(400)
            .json({ message: "location must be an object" });
        }

        const { city, country } = req.body.location;

        updates.locationName = {
          city: city ?? provider.locationName?.city,
          country: country ?? provider.locationName?.country,
        };
      }

      // ===============================
      // CONTACT OBJECT (FIXED)
      // ===============================
      else if (key === "contact") {
        if (typeof req.body.contact !== "object") {
          return res.status(400).json({ message: "contact must be an object" });
        }

        const { phone } = req.body.contact;

        updates.contact = {
          ...profile.contact, // fallback
          phone: phone !== undefined ? phone : profile.contact?.phone,
        };
      }

      // ===============================
      // SIMPLE FIELDS
      // ===============================
      else {
        updates[key] = req.body[key];
      }
    }

    Object.assign(profile, updates);
    await profile.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    next(error);
  }
});
export default router;
