const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("authService refresh rotation", () => {
  let authService;
  let authRepository;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.JWT_TOKEN = "jwt-secret";

    const jwt = {
      sign: sinon.stub().returns("new-access-token"),
    };

    const bcrypt = {
      hash: sinon.stub().resolves("hashed-refresh-token"),
      compare: sinon.stub().resolves(true),
    };

    const cryptoMock = {
      randomBytes: sinon.stub().returns(Buffer.from("new-refresh-seed")),
      createHash: sinon.stub().returns({
        update: sinon.stub().returnsThis(),
        digest: sinon.stub().returns("lookuphashlookuphash"),
      }),
    };

    authRepository = {
      createRefreshSession: sinon.stub().resolves(),
      deactivateSessionById: sinon.stub().resolves(),
      findActiveRefreshSessionByLookupHash: sinon.stub(),
      findUserByIdForSession: sinon.stub(),
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

  it("rotates only the current refresh session on refresh", async () => {
    authRepository.findActiveRefreshSessionByLookupHash.resolves({
      id: 88,
      user_id: 101,
      refresh_token: "stored-hash",
      refresh_token_lookup: "lookup",
      expires_at: "2099-01-01T00:00:00.000Z",
      is_active: true,
    });
    authRepository.findUserByIdForSession.resolves({
      user_id: 101,
      email: "mobile@example.com",
      name: "Mobile User",
      role_id: 7,
      account_status: "active",
      user_roles: { role_name: "user" },
    });

    const result = await authService.refreshAccessToken("raw-refresh-token", {
      ip: "127.0.0.1",
      userAgent: "ios-app",
    });

    expect(result.success).to.equal(true);
    expect(result.accessToken).to.equal("new-access-token");
    expect(authRepository.createRefreshSession.calledOnce).to.equal(true);
    expect(authRepository.deactivateSessionById.calledWith(88)).to.equal(true);
  });
});
