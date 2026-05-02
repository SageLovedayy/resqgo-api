import type { Request, Response, NextFunction } from "express";
import { IdempotencyKey } from "../models/IdempotencyKey.js";

export default async function idempotency(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Ensure no use with GET REQUESTS
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const key = req.header("Idempotency-Key");
  if (!key) return next();

  const requestHash = JSON.stringify({
    method: req.method,
    path: req.originalUrl,
    body: req.body,
  });

  let record = await IdempotencyKey.findOne({ key });

  if (record && record.requestHash !== requestHash) {
    return res.status(422).json({
      error: "Idempotency key reuse with different request",
    });
  }
  // Response already exists → replay
  if (record?.response) {
    return res.status(record.response.status).json(record.response.body);
  }

  // Request in progress
  if (record && !record.response) {
    return res.status(409).json({ error: "Request in progress" });
  }

  // Create lock (atomic via unique index)
  try {
    record = await IdempotencyKey.create({
      key,
      requestHash,
    });
  } catch (err: any) {
    // Someone else created it first i.e re-fetch
    if (err.code === 11000) {
      return res.status(409).json({ error: "Request in progress" });
    }
    throw err;
  }

  (req as any).idempotencyKey = key;

  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    IdempotencyKey.updateOne(
      { key },
      { $set: { response: { status: res.statusCode, body } } },
    ).catch(console.error);

    return originalJson(body);
  };

  next();
}
