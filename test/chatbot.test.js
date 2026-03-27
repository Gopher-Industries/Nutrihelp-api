require("dotenv").config();
const request = require("supertest");
const express = require("express");
const proxyquire = require("proxyquire");

const chatbotModel = {
  addHistory: jest.fn(),
  getHistory: jest.fn(),
  deleteHistory: jest.fn(),
};

const controller = proxyquire("../controller/chatbotController", {
  "../model/chatbotHistory": chatbotModel,
});

const app = express();
app.use(express.json());
app.post("/api/chatbot/query", controller.getChatResponse);
app.post("/api/chatbot/add_urls", controller.addURL);
app.post("/api/chatbot/add_pdfs", controller.addPDF);
app.post("/api/chatbot/history", controller.getChatHistory);
app.delete("/api/chatbot/history", controller.clearChatHistory);

describe("Chatbot API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /query should return 400 if user_id or user_input missing", async () => {
    const res = await request(app).post("/api/chatbot/query").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id and user_input are required/i);
  });

  it("POST /query should return 400 if user_input is empty string", async () => {
    const res = await request(app).post("/api/chatbot/query").send({ user_id: 1, user_input: " " });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_input must be a non-empty string/i);
  });

  it("POST /query should return 200 with fallback response if AI server fails", async () => {
    chatbotModel.addHistory.mockResolvedValueOnce(true);

    const res = await request(app).post("/api/chatbot/query").send({ user_id: 1, user_input: "Hello" });
    expect(res.statusCode).toBe(200);
    expect(res.body.response_text).toMatch(/I understand you're asking about "Hello"/i);
  });

  it("POST /add_urls should return 400 if urls not provided", async () => {
    const res = await request(app).post("/api/chatbot/add_urls").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/urls not found/i);
  });

  it("POST /add_urls should return 503 if AI server unavailable", async () => {
    const res = await request(app).post("/api/chatbot/add_urls").send({ urls: "https://example.com" });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/AI server unavailable/i);
  });

  it("POST /add_pdfs should return 200 with dummy response", async () => {
    const res = await request(app).post("/api/chatbot/add_pdfs").send({ pdfs: ["file1.pdf"] });
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toMatch(/dummy response/i);
  });

  it("POST /history should return 400 if user_id missing", async () => {
    const res = await request(app).post("/api/chatbot/history").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id is required/i);
  });

  it("DELETE /history should return 400 if user_id missing", async () => {
    const res = await request(app).delete("/api/chatbot/history").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id is required/i);
  });

  it("DELETE /history should return 200 if history cleared", async () => {
    chatbotModel.deleteHistory.mockResolvedValueOnce(true);
    const res = await request(app).delete("/api/chatbot/history").send({ user_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/cleared successfully/i);
  });
});
