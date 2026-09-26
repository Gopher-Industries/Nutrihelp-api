const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

function createRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    clearCookie() {
      return this;
    },
  };
}

function createSupabaseStub() {
  const insertStub = sinon.stub().resolves({});
  const deleteResolve = sinon.stub().resolves({});
  const gteStub = sinon.stub().resolves({ data: [], error: null });

  return {
    insertStub,
    deleteResolve,
    client: {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      gte: gteStub,
                    };
                  },
                };
              },
            };
          },
          insert: insertStub,
          delete() {
            return {
              eq() {
                return {
                  eq: deleteResolve,
                };
              },
            };
          },
        };
      },
    },
  };
}

describe("loginController trusted device flow", () => {
  let bcrypt;
  let jwt;
  let getUserCredentials;
  let addMfaToken;
  let verifyMfaToken;
  let authService;
  let validationResult;
  let logLoginEvent;
  let cryptoMock;
  let sendMail;
  let controller;

  beforeEach(() => {
    bcrypt = {
      compare: sinon.stub(),
    };
    jwt = {
      sign: sinon.stub().returns("jwt-token"),
    };
    getUserCredentials = sinon.stub();
    addMfaToken = sinon.stub().resolves();
    verifyMfaToken = sinon.stub().resolves(true);
    authService = {
      trustedDeviceCookieName: "trusted_device",
      trustedDeviceExpiry: 30 * 24 * 60 * 60 * 1000,
      validateTrustedDeviceToken: sinon.stub(),
      issueTrustedDeviceToken: sinon.stub(),
    };
    validationResult = sinon.stub().returns({
      isEmpty: () => true,
      array: () => [],
    });
    logLoginEvent = sinon.stub().resolves();
    cryptoMock = {
      randomInt: sinon.stub().returns(123456),
    };
    sendMail = sinon.stub().resolves();

    const supabaseStub = createSupabaseStub();

    controller = proxyquire("../controller/loginController", {
      bcryptjs: bcrypt,
      jsonwebtoken: jwt,
      "../model/getUserCredentials.js": getUserCredentials,
      "../model/addMfaToken.js": {
        addMfaToken,
        verifyMfaToken,
      },
      "../services/authService": authService,
      "../Monitor_&_Logging/loginLogger": logLoginEvent,
      crypto: cryptoMock,
      "../dbConnection": supabaseStub.client,
      "express-validator": {
        validationResult,
      },
      nodemailer: {
        createTransport: () => ({
          sendMail,
        }),
      },
    });
  });

  it("skips MFA when the trusted-device cookie is valid", async () => {
    const req = {
      body: {
        email: "user@example.com",
        password: "CurrentPass123!",
      },
      headers: {
        cookie: "trusted_device=trusted-token",
        "user-agent": "test-agent",
      },
      socket: {
        remoteAddress: "::1",
      },
      ip: "::1",
      get(header) {
        return this.headers[header.toLowerCase()];
      },
    };
    const res = createRes();

    getUserCredentials.resolves({
      user_id: 100,
      email: "user@example.com",
      password: "hashed",
      mfa_enabled: true,
      user_roles: { role_name: "user" },
    });
    bcrypt.compare.resolves(true);
    authService.validateTrustedDeviceToken.resolves({ valid: true });

    await controller.login(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.trusted_device).to.equal(true);
    expect(res.body.mfa_skipped).to.equal(true);
    expect(addMfaToken.called).to.equal(false);
    expect(res.cookies[0].name).to.equal("trusted_device");
  });

  it("issues a trusted-device cookie after successful MFA login", async () => {
    const req = {
      body: {
        email: "user@example.com",
        password: "CurrentPass123!",
        mfa_token: "123456",
      },
      headers: {
        "user-agent": "test-agent",
      },
      ip: "127.0.0.1",
      get(header) {
        return this.headers[header.toLowerCase()];
      },
    };
    const res = createRes();

    getUserCredentials.resolves({
      user_id: 100,
      email: "user@example.com",
      password: "hashed",
      user_roles: { role_name: "user" },
    });
    bcrypt.compare.resolves(true);
    authService.issueTrustedDeviceToken.resolves({
      token: "trusted-device-token",
    });

    await controller.loginMfa(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.trusted_device).to.equal(true);
    expect(res.cookies[0].name).to.equal("trusted_device");
    expect(res.cookies[0].value).to.equal("trusted-device-token");
  });
});
