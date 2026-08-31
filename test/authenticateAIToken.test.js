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

describe("authenticateAIToken middleware", () => {
  let authService;
  let authenticateAIToken;

  beforeEach(() => {
    authService = {
      verifyAIToken: sinon.stub(),
    };

    ({ authenticateAIToken } = proxyquire("../middleware/authenticateAIToken", {
      "../services/authService": authService,
    }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it("rejects website access tokens", async () => {
    const req = {
      headers: { authorization: "Bearer website-token" },
    };
    const res = createRes();
    const next = sinon.stub();

    authService.verifyAIToken.throws(new Error("jwt audience invalid"));

    await authenticateAIToken(req, res, next);

    expect(res.statusCode).to.equal(401);
    expect(next.called).to.equal(false);
  });

  it("accepts AI tokens and builds the expected req.user shape", async () => {
    const req = {
      headers: { authorization: "Bearer ai-token" },
    };
    const res = createRes();
    const next = sinon.stub();

    authService.verifyAIToken.returns({
      userId: 7,
      email: "user@example.com",
      role: "user",
      type: "ai_access",
    });

    await authenticateAIToken(req, res, next);

    expect(req.user).to.deep.equal({
      userId: 7,
      email: "user@example.com",
      role: "user",
    });

    expect(next.calledOnce).to.equal(true);
  });
});
