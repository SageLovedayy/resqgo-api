import { verifyToken } from "../utils/jwtTokenHandler.js";
import User from "../models/User.js";
import type { AxiosError } from "axios";
import type { Request, Response, NextFunction } from "express";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied" });
  }

  const token = authHeader.split(" ")[1] as string;

  try {
    const decoded = verifyToken(token);

    const user = await User.findOne({ _id: decoded._id }).select("status");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({
        message: "Your account has been suspended. Contact support.",
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    const error = err as AxiosError;
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Session expired. Please log in again." });
    } else if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ message: "Invalid token. Please provide a valid token." });
    } else {
      return res
        .status(401)
        .json({ message: "Authentication failed. Please try again." });
    }
  }
};
