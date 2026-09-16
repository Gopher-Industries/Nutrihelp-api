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

describe("authenticateToken middleware", () => {
  let authService;
  let authenticateToken;

  beforeEach(() => {
    authService = {
      verifyAccessToken: sinon.stub(),
    };

    ({ authenticateToken } = proxyquire("../middleware/authenticateToken", {
      "../services/authService": authService,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it("rejects requests with no Authorization header", async () => {
    const req = { headers: {} };
    const res = createRes();
    const next = sinon.stub();

    await authenticateToken(req, res, next);

    expect(res.statusCode).to.equal(401);
    expect(res.body.code).to.equal("TOKEN_MISSING");
    expect(next.called).to.equal(false);
  });

  it("rejects malformed Authorization headers", async () => {
    const req = { headers: { authorization: "Token abc" } };
    const res = createRes();
    const next = sinon.stub();

    await authenticateToken(req, res, next);

    expect(res.statusCode).to.equal(401);
    expect(res.body.code).to.equal("INVALID_AUTH_HEADER");
    expect(next.called).to.equal(false);
  });

  it("rejects non-access tokens", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = createRes();
    const next = sinon.stub();

    authService.verifyAccessToken.returns({
      userId: 1,
      email: "user@example.com",
      role: "user",
      type: "refresh",
    });

    await authenticateToken(req, res, next);

    expect(res.statusCode).to.equal(401);
    expect(res.body.code).to.equal("INVALID_TOKEN_TYPE");
    expect(next.called).to.equal(false);
  });

  it("attaches the decoded user for valid access tokens", async () => {
    const req = { headers: { authorization: "Bearer valid-token" } };
    const res = createRes();
    const next = sinon.stub();

    authService.verifyAccessToken.returns({
      userId: 7,
      email: "user@example.com",
      role: "user",
      type: "access",
    });

    await authenticateToken(req, res, next);

    expect(req.user).to.deep.equal({
      userId: 7,
      email: "user@example.com",
      role: "user",
    });
    expect(next.calledOnce).to.equal(true);
  });

  it("rejects AI access tokens", async () => {
    const req = { headers: { authorization: "Bearer ai-token" } };
    const res = createRes();
    const next = sinon.stub();

    authService.verifyAccessToken.returns({
      userId: 7,
      email: "user@example.com",
      role: "user",
      type: "ai_access",
    });

    await authenticateToken(req, res, next);

    expect(res.statusCode).to.equal(401);
    expect(res.body.code).to.equal("INVALID_TOKEN_TYPE");
    expect(next.called).to.equal(false);
  });

});
