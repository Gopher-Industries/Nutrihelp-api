const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

const createRes = () => {
  const res = {
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
    send(payload) {
      this.body = payload;
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
      compare: jest.fn(),
      hash: jest.fn(),
    };
    getUser = jest.fn();
    updateUser = jest.fn();
    authService = {
      logoutAll: jest.fn().mockResolvedValue({ success: true }),
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

    getUser.mockResolvedValue([{ password: "hashed-password" }]);
    bcrypt.compare.mockResolvedValue(true);

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

    getUser.mockResolvedValue([{ password: "hashed-password" }]);
    bcrypt.compare.mockResolvedValue(false);

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
      },
    };
    const res = createRes();

    getUser.mockResolvedValue([{ password: "hashed-password" }]);
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("new-hash");
    updateUser.mockResolvedValue(undefined);

    await controller.updateUserPassword(req, res);

    expect(updateUser.mock.calls[0]).to.deep.equal(["user-123", "new-hash"]);
    expect(authService.logoutAll.mock.calls[0]).to.deep.equal(["user-123"]);
    expect(res.statusCode).to.equal(200);
    expect(res.body.code).to.equal("PASSWORD_UPDATED");
    expect(res.body.require_reauthentication).to.equal(true);
  });

  it("rejects weak new passwords", async () => {
    const req = {
      user: { userId: "user-123" },
      body: {
        password: "CurrentPass123!",
        new_password: "weak",
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
      },
    };
    const res = createRes();

    await controller.updateUserPassword(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.code).to.equal("PASSWORD_REUSE");
  });
});
