const request = require("supertest");

// NutriHelp API runs on port 80 -> http://localhost:80
const BASE_URL = "http://localhost:80";

// Helper for readable assertions (not strictly needed but nice)
const isOkOrClientError = (status) => status >= 200 && status < 500;

describe(" Authentication & Security Tests", () => {
  //
  // 1) LOGIN FLOW
  //
  describe("Login flow", () => {
    test("rejects clearly invalid credentials", async () => {
      const res = await request(BASE_URL)
        .post("/auth/login")
        .send({
          email: "invalid-user@example.com",
          password: "wrong-password",
        });

      // For bad credentials we expect some kind of auth failure
      expect([400, 401, 404]).toContain(res.statusCode);
    });

    test("does not crash on malformed login payload", async () => {
      const res = await request(BASE_URL)
        .post("/auth/login")
        // missing email/password on purpose
        .send({});

      // Security: endpoint must not return 5xx / server crash
      expect(isOkOrClientError(res.statusCode)).toBe(true);
    });
  });

  //
  // 2) REFRESH TOKEN FLOW
  //
  describe("Refresh token flow", () => {
    test("rejects missing refresh token", async () => {
      const res = await request(BASE_URL)
        .post("/auth/refresh")
        .send({}); // no token

      // Any of these is acceptable for a missing/invalid refresh token
      expect([400, 401, 403, 404]).toContain(res.statusCode);
    });

    test("rejects obviously invalid refresh token", async () => {
      const res = await request(BASE_URL)
        .post("/auth/refresh")
        .send({ refreshToken: "this-is-not-a-real-token" });

      expect([400, 401, 403, 404]).toContain(res.statusCode);
    });
  });

  //
  // 3) CONSENT ENDPOINTS
  //
  describe("Consent endpoints", () => {
    test("requires auth to read consent status", async () => {
      const res = await request(BASE_URL).get("/consent");

      // Unauthenticated users should not see consent state
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test("requires auth to update consent", async () => {
      const res = await request(BASE_URL)
        .post("/consent")
        .send({
          marketing: false,
          dataSharing: false,
        });

      // Unauthenticated users should not be allowed to update consent
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });

  //
  // 4) RBAC / PROTECTED ROUTES
  //
  describe("RBAC / protected routes", () => {
    test("denies access to user profile without token", async () => {
      const res = await request(BASE_URL).get("/user/profile");

      // No token -> should not be treated as a normal successful request
      expect([401, 403, 404]).toContain(res.statusCode);
    });

    test("denies access to admin endpoint without token", async () => {
      const res = await request(BASE_URL).get("/admin/users");

      // Admin-only route should never be accessible anonymously
      expect([401, 403, 404]).toContain(res.statusCode);
    });
  });
});
