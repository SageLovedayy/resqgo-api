import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/services/emailService", () => ({
  sendActivationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmail: vi.fn(),
}));

import { signup } from "../../api/controllers/authController.js";
import * as emailService from "../../api/services/emailService.js";

const mockReq = (body = {}) =>
  ({
    body,
  }) as any;

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext = vi.fn();

describe("authController - signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendActivationEmail and returns 201", async () => {
    const req = mockReq({
      email: "test@example.com",
      password: "Password123!",
      fullName: "Test User",
    });
    const res = mockRes();

    await signup(req, res, mockNext);

    expect(emailService.sendActivationEmail).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@example.com" }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("passes error to next() if something throws", async () => {
    const req = mockReq({
      email: "fail@example.com",
      password: "Password123!",
      fullName: "Fail User",
    });
    const res = mockRes();

    // Force sendActivationEmail to throw
    vi.mocked(emailService.sendActivationEmail).mockRejectedValueOnce(
      new Error("SMTP failed"),
    );

    await signup(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
