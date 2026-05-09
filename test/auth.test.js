const request = require("supertest");
const BASE_URL = "http://localhost:80";

describe("Security Test", () => {
  it("Login endpoint should respond", async () => {
    const res = await request(BASE_URL)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "test1234",
      });

    // ✅ Security check: API should NOT crash (no 5xx)
    expect(res.statusCode).toBeLessThan(500);
  });

  it("Protected route should reject request without token", async () => {
    const res = await request(BASE_URL).get("/user/profile");

    // ✅ Any of these is OK for an unauthenticated request
    expect([401, 403, 404]).toContain(res.statusCode);
  });
});

