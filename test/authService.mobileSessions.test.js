const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("authService mobile session support", () => {
  let authService;
  let authRepository;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.JWT_TOKEN = "jwt-secret";

    const jwt = {
      sign: sinon.stub().returns("signed-access-token"),
      verify: sinon.stub(),
    };

    const bcrypt = {
      hash: sinon.stub().resolves("hashed-refresh-token"),
      compare: sinon.stub(),
    };

    const cryptoMock = {
      randomBytes: sinon.stub().returns(Buffer.from("refresh-token-seed")),
      createHash: sinon.stub().returns({
        update: sinon.stub().returnsThis(),
        digest: sinon.stub().returns("lookuphashlookuphash"),
      }),
    };

    authRepository = {
      createRefreshSession: sinon.stub().resolves(),
    };

    authService = proxyquire("../services/authService", {
      jsonwebtoken: jwt,
      bcrypt,
      crypto: cryptoMock,
      "../repositories/authRepository": authRepository,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("creates a refresh session without invalidating other active sessions", async () => {
    const payload = await authService.generateTokenPair({
      user_id: 101,
      email: "mobile@example.com",
      user_roles: { role_name: "user" },
    }, {
      userAgent: "ios-app",
      ip: "127.0.0.1",
    });

    expect(payload.accessToken).to.equal("signed-access-token");
    expect(payload.refreshToken).to.be.a("string");
    expect(authRepository.createRefreshSession.calledOnce).to.equal(true);
  });
});
