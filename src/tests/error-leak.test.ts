import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../api/services/emailService", () => ({
  sendActivationEmail: vi
    .fn()
    .mockRejectedValue(new Error("SMTP connection failed")),
}));
import { app } from "../api/app";

describe("POST /signup - error safety", () => {
  it("does not expose internal error details", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      email: "test@example.com",
      password: "Password123!",
      fullName: "Test User",
    });

    expect(res.status).toBe(500);

    expect(res.body).toEqual({
      message: "Internal Server Error",
    });

    expect(JSON.stringify(res.body)).not.toMatch(/mongo/i);
    expect(JSON.stringify(res.body)).not.toMatch(/stack/i);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    expect(JSON.stringify(res.body)).not.toMatch(/CastError/i);
  });
});
