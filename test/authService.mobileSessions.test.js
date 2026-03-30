const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("authService mobile session support", () => {
  let createClient;
  let anonClient;
  let serviceClient;
  let jwt;
  let bcrypt;
  let cryptoMock;
  let authService;

  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.JWT_TOKEN = "jwt-secret";

    anonClient = {};
    serviceClient = {
      from: sinon.stub(),
    };

    createClient = sinon.stub();
    createClient.onCall(0).returns(anonClient);
    createClient.onCall(1).returns(serviceClient);

    jwt = {
      sign: sinon.stub().returns("signed-access-token"),
      verify: sinon.stub(),
    };

    bcrypt = {
      hash: sinon.stub().resolves("hashed-refresh-token"),
      compare: sinon.stub(),
    };

    cryptoMock = {
      randomBytes: sinon.stub().returns(Buffer.from("refresh-token-seed")),
      createHash: sinon.stub().returns({
        update: sinon.stub().returnsThis(),
        digest: sinon.stub().returns("lookuphashlookuphash"),
      }),
    };

    authService = proxyquire("../services/authService", {
      "@supabase/supabase-js": { createClient },
      jsonwebtoken: jwt,
      bcrypt,
      crypto: cryptoMock,
      "../Monitor_&_Logging/loginLogger": sinon.stub().resolves(),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("creates a refresh session without invalidating other active sessions", async () => {
    const insert = sinon.stub().resolves({ error: null });
    const update = sinon.stub();

    serviceClient.from.withArgs("user_sessiontoken").returns({
      insert,
      update,
    });

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
    expect(insert.calledOnce).to.equal(true);
    expect(update.called).to.equal(false);
  });
});
