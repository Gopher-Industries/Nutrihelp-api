const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

function createSupabaseStub(initialUsers = []) {
  const users = initialUsers.map((user) => ({ ...user }));
  const tokens = [];

  function createBuilder(table) {
    const state = {
      filters: [],
      updateValues: null,
      insertValues: null,
      single: false,
      limit: null,
    };

    const thenable = {
      select() {
        return this;
      },
      eq(column, value) {
        state.filters.push({ column, value });
        return this;
      },
      order() {
        return this;
      },
      limit(value) {
        state.limit = value;
        return this;
      },
      single() {
        state.single = true;
        return this;
      },
      update(values) {
        state.updateValues = values;
        return this;
      },
      insert(values) {
        state.insertValues = values;
        return this;
      },
      then(resolve, reject) {
        try {
          resolve(execute());
        } catch (error) {
          reject(error);
        }
      },
    };

    function matchFilters(record) {
      return state.filters.every(({ column, value }) => record[column] === value);
    }

    function execute() {
      if (table === "users") {
        if (state.insertValues) {
          const value = Array.isArray(state.insertValues)
            ? state.insertValues[0]
            : state.insertValues;
          users.push({ ...value });
          return { data: value, error: null, status: 201, statusText: "Created" };
        }

        if (state.updateValues) {
          users.forEach((user) => {
            if (matchFilters(user)) {
              Object.assign(user, state.updateValues);
            }
          });
          return { data: null, error: null, status: 200, statusText: "OK" };
        }

        const found = users.filter(matchFilters);
        if (state.single) {
          return {
            data: found[0] || null,
            error: found[0] ? null : { code: "PGRST116" },
            status: found[0] ? 200 : 406,
            statusText: found[0] ? "OK" : "Not Acceptable",
          };
        }

        return { data: found, error: null, status: 200, statusText: "OK" };
      }

      if (table === "password_reset_tokens") {
        if (state.insertValues) {
          const value = Array.isArray(state.insertValues)
            ? state.insertValues[0]
            : state.insertValues;
          tokens.push({
            id: tokens.length + 1,
            ...value,
          });
          return { data: null, error: null, status: 201, statusText: "Created" };
        }

        if (state.updateValues) {
          tokens.forEach((token) => {
            if (matchFilters(token)) {
              Object.assign(token, state.updateValues);
            }
          });
          return { data: null, error: null, status: 200, statusText: "OK" };
        }

        let found = tokens.filter(matchFilters);
        if (typeof state.limit === "number") {
          found = found.slice(0, state.limit);
        }
        return { data: found, error: null, status: 200, statusText: "OK" };
      }

      throw new Error(`Unsupported table ${table}`);
    }

    return thenable;
  }

  return {
    from(table) {
      return createBuilder(table);
    },
    __tokens: tokens,
    __users: users,
  };
}

describe("passwordResetService", () => {
  beforeEach(() => {
    process.env.GMAIL_USER = "mailer@test.local";
    process.env.GMAIL_APP_PASSWORD = "test-app-password";
  });

  it("completes request, verify, and reset flow", async () => {
    const supabase = createSupabaseStub([
      {
        user_id: 1,
        email: "user@example.com",
        name: "User",
        password: "old-hash",
      },
    ]);
    let sentCode = null;

    const service = proxyquire("../services/passwordResetService", {
      "../dbConnection": supabase,
      nodemailer: {
        createTransport: () => ({
          sendMail: async (payload) => {
            sentCode = String(payload.text).match(/code is (\d{6})/)[1];
            return { response: "ok" };
          },
        }),
      },
      bcryptjs: {
        hash: async (value) => `hashed:${value}`,
      },
    });

    const request = await service.requestReset("user@example.com", {
      ip: "127.0.0.1",
      userAgent: "test-agent",
    });
    const verification = await service.verifyCode("user@example.com", sentCode);
    const reset = await service.resetPassword({
      email: "user@example.com",
      resetToken: verification.resetToken,
      newPassword: "Stronger!123",
    });

    expect(request.success).to.equal(true);
    expect(verification.success).to.equal(true);
    expect(verification.resetToken).to.be.a("string");
    expect(reset.success).to.equal(true);
    expect(supabase.__users[0].password).to.equal("hashed:Stronger!123");
  });

  it("rejects invalid verification codes", async () => {
    const supabase = createSupabaseStub([
      {
        user_id: 1,
        email: "user@example.com",
        name: "User",
        password: "old-hash",
      },
    ]);

    const service = proxyquire("../services/passwordResetService", {
      "../dbConnection": supabase,
      nodemailer: {
        createTransport: () => ({
          sendMail: async () => ({ response: "ok" }),
        }),
      },
      bcryptjs: {
        hash: async (value) => `hashed:${value}`,
      },
    });

    await service.requestReset("user@example.com");

    try {
      await service.verifyCode("user@example.com", "000000");
      throw new Error("Expected invalid code error");
    } catch (error) {
      expect(error.message).to.equal("Verification code is invalid or has expired");
    }
  });

  it("rejects expired verification codes", async () => {
    const supabase = createSupabaseStub([
      {
        user_id: 1,
        email: "user@example.com",
        name: "User",
        password: "old-hash",
      },
    ]);
    let sentCode = null;

    const service = proxyquire("../services/passwordResetService", {
      "../dbConnection": supabase,
      nodemailer: {
        createTransport: () => ({
          sendMail: async (payload) => {
            sentCode = String(payload.text).match(/code is (\d{6})/)[1];
            return { response: "ok" };
          },
        }),
      },
      bcryptjs: {
        hash: async (value) => `hashed:${value}`,
      },
    });

    await service.requestReset("user@example.com");
    supabase.__tokens[0].expires_at = new Date(Date.now() - 60_000).toISOString();

    try {
      await service.verifyCode("user@example.com", sentCode);
      throw new Error("Expected expired code error");
    } catch (error) {
      expect(error.message).to.equal("Verification code is invalid or has expired");
    }
  });
});
