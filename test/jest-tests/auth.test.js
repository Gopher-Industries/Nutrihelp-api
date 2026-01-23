const request = require("supertest");

const BASE_URL = process.env.BASE_URL || "http://localhost:80";

describe("Authentication & Security Tests", () => {

  /* ---------------- LOGIN ---------------- */
  describe("Login flow", () => {
    test("rejects clearly invalid credentials", async () => {
      const res = await request(BASE_URL)
        .post("/login")
        .send({
          email: "invalid-user@example.com",
          password: "wrong-password",
        });

      expect([400, 401]).toContain(res.statusCode);
    });

    test("does not crash on malformed login payload", async () => {
      const res = await request(BASE_URL)
        .post("/login")
        .send({});

      expect(res.statusCode).toBeLessThan(500);
    });
  });

  /* ---------------- CONSENT / PREFERENCES ---------------- */
  describe("Consent / Preferences endpoints", () => {
    test("requires auth to read preferences", async () => {
      const res = await request(BASE_URL)
        .get("/user/preferences");

      expect([401, 403]).toContain(res.statusCode);
    });

    test("requires auth to update preferences", async () => {
      const res = await request(BASE_URL)
        .post("/user/preferences")
        .send({ marketing: false });

      expect([401, 403]).toContain(res.statusCode);
    });
  });

  /* ---------------- RBAC ---------------- */
  describe("RBAC / protected routes", () => {
    test("denies access to user profile without token", async () => {
      const res = await request(BASE_URL)
        .get("/userprofile");

      expect([401, 403]).toContain(res.statusCode);
    });
  });
});
