const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("authService refresh rotation", () => {
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

    anonClient = {
      from: sinon.stub(),
    };
    serviceClient = {
      from: sinon.stub(),
    };

    createClient = sinon.stub();
    createClient.onCall(0).returns(anonClient);
    createClient.onCall(1).returns(serviceClient);

    jwt = {
      sign: sinon.stub().returns("new-access-token"),
    };

    bcrypt = {
      hash: sinon.stub().resolves("hashed-refresh-token"),
      compare: sinon.stub().resolves(true),
    };

    cryptoMock = {
      randomBytes: sinon.stub().returns(Buffer.from("new-refresh-seed")),
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

  it("rotates only the current refresh session on refresh", async () => {
    const refreshSelect = {
      select: sinon.stub().returnsThis(),
      eq: sinon.stub().returnsThis(),
      limit: sinon.stub().resolves({
        data: [
          {
            id: 88,
            user_id: 101,
            refresh_token: "stored-hash",
            refresh_token_lookup: "lookup",
            expires_at: "2099-01-01T00:00:00.000Z",
            is_active: true,
          },
        ],
        error: null,
      }),
    };

    const refreshUpdate = {};
    refreshUpdate.update = sinon.stub().callsFake(() => refreshUpdate);
    refreshUpdate.eq = sinon.stub().resolves({ error: null });

    const refreshInsert = sinon.stub().resolves({ error: null });

    serviceClient.from.callsFake((table) => {
      if (table !== "user_sessiontoken") throw new Error(`Unexpected table ${table}`);

      if (!serviceClient._callCount) serviceClient._callCount = 0;
      serviceClient._callCount += 1;

      if (serviceClient._callCount === 1) return refreshSelect;
      if (serviceClient._callCount === 2) return { insert: refreshInsert };
      if (serviceClient._callCount === 3) return refreshUpdate;
      throw new Error("Unexpected user_sessiontoken call count");
    });

    anonClient.from.callsFake((table) => {
      if (table !== "users") throw new Error(`Unexpected table ${table}`);
      return {
        select: sinon.stub().returnsThis(),
        eq: sinon.stub().returnsThis(),
        single: sinon.stub().resolves({
          data: {
            user_id: 101,
            email: "mobile@example.com",
            name: "Mobile User",
            role_id: 7,
            account_status: "active",
            user_roles: { role_name: "user" },
          },
          error: null,
        }),
      };
    });

    const result = await authService.refreshAccessToken("raw-refresh-token", {
      ip: "127.0.0.1",
      userAgent: "ios-app",
    });

    expect(result.success).to.equal(true);
    expect(result.accessToken).to.equal("new-access-token");
    expect(refreshInsert.calledOnce).to.equal(true);
    expect(refreshUpdate.update.calledWith({ is_active: false })).to.equal(true);
    expect(refreshUpdate.eq.calledWith("id", 88)).to.equal(true);
  });
});
