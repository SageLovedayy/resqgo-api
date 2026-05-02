import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { app } from "../../src/api/app";
import User from "../../src/api/models/User";
import * as EmailService from "../api/services/emailService";

import { getRoutes } from "../api/utils/getRoutes";

const forbiddenPatterns = [
  /mongo/i,
  /mongoose/i,
  /smtp/i,
  /stack/i,
  /password/i,
  /casterror/i,
  /nodemailer/i,
  /sequelize/i,
  /prisma/i,
];

// Mock Mongoose methods to throw, forcing routes into error paths
beforeAll(() => {
  vi.spyOn(User, "findOne").mockRejectedValue(new Error("DB failure"));
  vi.spyOn(User, "create").mockRejectedValue(new Error("DB failure"));

  vi.spyOn(EmailService, "sendEmail").mockRejectedValue(
    new Error("SMTP failure"),
  );
  vi.spyOn(EmailService, "sendActivationEmail").mockRejectedValue(
    new Error("SMTP failure"),
  );
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("Global Error Safety (All Routes)", () => {
  const routes = getRoutes(app);

  it("should discover at least one route", () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  for (const route of routes) {
    it(`${route.method} ${route.path} does not leak internal errors`, async () => {
      let res;

      try {
        // Send empty body / query to trigger validations
        res = await request(app)
          [route.method.toLowerCase() as "get" | "post"](route.path)
          .send({});
      } catch (err) {
        throw err;
      }

      if (res.status < 400) return;

      const bodyStr = JSON.stringify(res.body);

      for (const pattern of forbiddenPatterns) {
        expect(bodyStr).not.toMatch(pattern);
      }

      if (res.status >= 500) {
        expect(res.body).toEqual({ message: "Internal Server Error" });
      }
    }, 15_000);
  }
});
