const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");

const createRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookiesCleared: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    clearCookie(name) {
      this.cookiesCleared.push(name);
      return this;
    },
  };

  return res;
};

describe("userPasswordController", () => {
  let bcrypt;
  let getUser;
  let updateUser;
  let authService;
  let controller;

  beforeEach(() => {
    bcrypt = {
      compare: sinon.stub(),
      hash: sinon.stub(),
    };
    getUser = sinon.stub();
    updateUser = sinon.stub();
    authService = {
      logoutAll: sinon.stub().resolves({ success: true }),
    };

    controller = proxyquire("../controller/userPasswordController", {
      bcryptjs: bcrypt,
      "../model/getUserPassword.js": getUser,
      "../model/updateUserPassword.js": updateUser,
      "../services/authService": authService,
    });
  });

  it("verifies current password for the authenticated user", async () => {
    const req = {
      user: { userId: "user-123" },
      body: { user_id: "user-123", password: "CurrentPass123!" },
    };
    const res = createRes();

    getUser.resolves([{ password: "hashed-password", mfa_enabled: true }]);
    bcrypt.compare.resolves(true);

    await controller.verifyCurrentPassword(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.deep.equal({
      message: "Current password verified",
      verified: true,
    });
  });

  it("rejects body-trusted identity mismatches", async () => {
    const req = {
      user: { userId: "user-123" },
      body: { user_id: "another-user", password: "CurrentPass123!" },
    };
    const res = createRes();

    await controller.verifyCurrentPassword(req, res);

    expect(res.statusCode).to.equal(403);
    expect(res.body.code).to.equal("UNAUTHORIZED_USER_CONTEXT");
  });

  it("rejects invalid current password on verify", async () => {
    const req = {
      user: { userId: "user-123" },
      body: { password: "WrongPassword" },
    };
    const res = createRes();

    getUser.resolves([{ password: "hashed-password", mfa_enabled: false }]);
    bcrypt.compare.resolves(false);

    await controller.verifyCurrentPassword(req, res);

    expect(res.statusCode).to.equal(401);
    expect(res.body.code).to.equal("CURRENT_PASSWORD_INVALID");
  });

  it("updates password, invalidates sessions, and requires reauthentication", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "NewPass123!",
        confirm_password: "NewPass123!",
      },
    };
    const res = createRes();

    getUser.resolves([{ password: "hashed-password", mfa_enabled: true }]);
    bcrypt.compare.resolves(true);
    bcrypt.hash.resolves("new-hash");
    updateUser.resolves(undefined);

    await controller.updateUserPassword(req, res);

    expect(updateUser.firstCall.args).to.deep.equal(["user-123", "new-hash"]);
    expect(authService.logoutAll.firstCall.args[0]).to.equal("user-123");
    expect(authService.logoutAll.firstCall.args[1].reason).to.equal("password_change");
    expect(res.statusCode).to.equal(200);
    expect(res.body.code).to.equal("PASSWORD_UPDATED");
    expect(res.body.require_reauthentication).to.equal(true);
    expect(res.body.require_mfa).to.equal(true);
    expect(res.body.reauthentication_flow).to.equal("LOGIN_MFA");
    expect(res.cookiesCleared).to.include("trusted_device");
  });

  it("returns standard login reauthentication when MFA is not enabled", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "NewPass123!",
        confirm_password: "NewPass123!",
      },
    };
    const res = createRes();

    getUser.resolves([{ password: "hashed-password", mfa_enabled: false }]);
    bcrypt.compare.resolves(true);
    bcrypt.hash.resolves("new-hash");
    updateUser.resolves(undefined);

    await controller.updateUserPassword(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.require_mfa).to.equal(false);
    expect(res.body.reauthentication_flow).to.equal("LOGIN");
  });

  it("rejects weak new passwords", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "weak",
        confirm_password: "weak",
      },
    };
    const res = createRes();

    await controller.updateUserPassword(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("WEAK_PASSWORD");
  });

  it("rejects password reuse", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "CurrentPass123!",
        confirm_password: "CurrentPass123!",
      },
    };
    const res = createRes();

    await controller.updateUserPassword(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("PASSWORD_REUSE");
  });

  it("rejects mismatched confirm password", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "NewPass123!",
        confirm_password: "Mismatch123!",
      },
    };
    const res = createRes();

    await controller.updateUserPassword(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("PASSWORD_MISMATCH");
  });
});
