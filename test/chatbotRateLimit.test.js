const { expect } = require("chai");
const express = require("express");
const request = require("supertest");
const chatbotLimiter = require("../middleware/chatbotRateLimit");

function buildApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use(chatbotLimiter);
  app.post("/api/chatbot/query", (req, res) => {
    res.status(200).json({ success: true });
  });
  return app;
}

describe("chatbotRateLimit middleware", () => {
  it("allows the first 10 requests within the window", async () => {
    const app = buildApp();

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post("/api/chatbot/query")
        .send({ user_input: "hello" });

      expect(res.status).to.equal(200);
    }
  });

  it("blocks the 11th request within the same window with a 429", async () => {
    const app = buildApp();

    for (let i = 0; i < 10; i += 1) {
      await request(app).post("/api/chatbot/query").send({ user_input: "hello" });
    }

    const res = await request(app)
      .post("/api/chatbot/query")
      .send({ user_input: "one too many" });

    expect(res.status).to.equal(429);
    expect(res.body).to.deep.equal({
      error: "Too many chatbot requests. Please slow down and try again shortly.",
    });
  });

  it("keys separate IPs independently, so a fresh IP is not blocked by another IP's usage", async () => {
    const app = buildApp();

    for (let i = 0; i < 10; i += 1) {
      await request(app)
        .post("/api/chatbot/query")
        .set("X-Forwarded-For", "1.1.1.1")
        .send({ user_input: "hello" });
    }

    const blocked = await request(app)
      .post("/api/chatbot/query")
      .set("X-Forwarded-For", "1.1.1.1")
      .send({ user_input: "hello" });
    expect(blocked.status).to.equal(429);

    const otherIp = await request(app)
      .post("/api/chatbot/query")
      .set("X-Forwarded-For", "2.2.2.2")
      .send({ user_input: "hello" });
    expect(otherIp.status).to.equal(200);
  });

  it("sets standard RateLimit-* headers and omits legacy X-RateLimit-* headers", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/chatbot/query")
      .send({ user_input: "hello" });

    expect(res.headers).to.have.property("ratelimit-limit");
    expect(res.headers).to.not.have.property("x-ratelimit-limit");
  });
});
