import { Request, Response } from "express";
import Provider from "../models/Provider.js";
import { RequestHandler } from "express";
import User from "../models/User.js";

const defaultImage = "https://i.sstatic.net/l60Hf.png";

export const getNearbyProviders = async (req: Request, res: Response) => {
  try {
    const { lng, lat, radius = 5000, service, limit = 20 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({ message: "lng and lat are required" });
    }

    const longitude = parseFloat(lng as string);
    const latitude = parseFloat(lat as string);
    const maxDistance = parseInt(radius as string);
    const maxResults = parseInt(limit as string);

    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          maxDistance,
          spherical: true,
        },
      },
      {
        $match: {
          available: true,
          ...(service ? { services: service } : {}),
        },
      },

      // Join Profile
      {
        $lookup: {
          from: "profiles", // Mongo uses lowercase plural of model name
          localField: "userId",
          foreignField: "userId",
          as: "profile",
        },
      },

      //Filter needed fields
      {
        $project: {
          businessName: 1,
          location: 1,
          locationName: 1,
          services: 1,
          charges: 1,
          engagement: 1,
          distance: 1,
          "profile.photoUrl": 1,
        },
      },

      // Flatten profile array
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $limit: maxResults,
      },
    ];

    const providers = await Provider.aggregate(pipeline);

    const result = providers.map((p: any) => ({
      id: p._id.toString(),
      name: p.businessName,
      location: p.location.coordinates, // [lng, lat]

      imageUrl: p.profile?.photoUrl ?? defaultImage,
      details: {
        avgRat: p.engagement?.avgRating ?? 0,
        locationName: p.locationName,
        services: p.services,
        charges: String(p.charges ?? ""),
      },

      distance: `${(p.distance / 1000).toFixed(1)} km`,
    }));

    return res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch nearby providers",
    });
  }
};

export const getAllProviders = async (req: Request, res: Response) => {
  try {
    const result = await Provider.find({});

    return res.json({
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch all providers",
    });
  }
};

export const onboardProvider: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role !== "PROVIDER") {
      return res.status(403).json({
        message: "Only providers can complete onboarding",
      });
    }

    const existingProvider = await Provider.findOne({
      userId: user._id,
    });

    if (existingProvider) {
      return res.status(409).json({
        message: "Provider profile already exists",
      });
    }

    const payload = req.body;

    const provider = await Provider.create({
      userId: user._id,
      businessName: payload.businessName,
      phoneNumber: payload.phoneNumber,
      services: payload.services,
      charges: payload.charges,
      location: {
        type: "Point",
        coordinates: payload.location.coordinates,
      },
      locationName: payload.locationName,
    });

    await User.updateOne({ _id: user._id }, { onboardingStatus: "COMPLETED" });

    return res.status(201).json({
      message: "Provider onboarding completed",
      provider: {
        id: provider._id,
      },
    });
  } catch (error) {
    next(error);
  }
};
