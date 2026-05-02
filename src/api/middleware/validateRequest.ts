import type { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { logger } from "../utils/logger.js";

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      { errors: errors.array(), body: req.body },
      "Validation failed",
    );
    return res.status(400).json({ error: "Invalid request data" });
  }

  next();
}
