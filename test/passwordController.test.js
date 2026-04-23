const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("passwordController", () => {
  let validationResultStub;
  let passwordResetService;
  let controller;

  beforeEach(() => {
    validationResultStub = sinon.stub().returns({
      isEmpty: () => true,
      array: () => [],
    });

    passwordResetService = {
      requestReset: sinon.stub(),
      verifyCode: sinon.stub(),
      resetPassword: sinon.stub(),
    };

    controller = proxyquire("../controller/passwordController", {
      "express-validator": { validationResult: validationResultStub },
      "../services/passwordResetService": passwordResetService,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns the generic request-reset success envelope", async () => {
    const req = {
      body: { email: "user@example.com" },
      ip: "127.0.0.1",
      get: sinon.stub().returns("test-agent"),
    };
    const res = createRes();

    passwordResetService.requestReset.resolves({
      success: true,
      message: "If that email exists, a verification code was sent.",
    });

    await controller.requestReset(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(passwordResetService.requestReset.calledOnce).to.equal(true);
  });

  it("surfaces invalid or expired verification-code errors safely", async () => {
    const req = {
      body: { email: "user@example.com", code: "123456" },
      ip: "127.0.0.1",
      get: sinon.stub().returns("test-agent"),
    };
    const res = createRes();
    const error = new Error("Verification code is invalid or has expired");
    error.status = 401;

    passwordResetService.verifyCode.rejects(error);

    await controller.verifyCode(req, res);

    expect(res.statusCode).to.equal(401);
    expect(res.body.error).to.equal("Verification code is invalid or has expired");
  });

  it("returns a reset token when the verification code is valid", async () => {
    const req = {
      body: { email: "user@example.com", code: "123456" },
      ip: "127.0.0.1",
      get: sinon.stub().returns("test-agent"),
    };
    const res = createRes();

    passwordResetService.verifyCode.resolves({
      success: true,
      message: "Verification code accepted.",
      resetToken: "reset-token",
      expiresIn: 900,
    });

    await controller.verifyCode(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.resetToken).to.equal("reset-token");
  });

  it("resets the password after a valid token exchange", async () => {
    const req = {
      body: {
        email: "user@example.com",
        resetToken: "reset-token",
        newPassword: "Stronger!1",
      },
    };
    const res = createRes();

    passwordResetService.resetPassword.resolves({
      success: true,
      message: "Password updated successfully.",
    });

    await controller.resetPassword(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.message).to.equal("Password updated successfully.");
  });
});
