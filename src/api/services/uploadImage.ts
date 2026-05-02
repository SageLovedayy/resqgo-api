import Profile from "../models/Profile.js";
import { Request, Response } from "express";

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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Save Cloudinary image URL
    console.log("cloudinary url: ", req.file.path);
    user["photoUrl"] = req.file.path;
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

export { uploadImage };
