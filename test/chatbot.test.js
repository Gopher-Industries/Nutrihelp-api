require("dotenv").config();
const request = require("supertest");
const BASE_URL = "http://localhost:80";

const supabase = require("../dbConnection.js");
const chatbotModel = require("../model/chatbotHistory");

// Mock Supabase methods
jest.mock("../dbConnection.js", () => ({
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
}));

// Mock node-fetch
jest.mock("node-fetch", () => jest.fn());
const fetch = require("node-fetch");

describe("Chatbot API", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------
  // getChatResponse - /query
  // -------------------------
  it("POST /query should return 400 if user_id or user_input missing", async () => {
    const res = await request(BASE_URL).post("/api/chatbot/query").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id and user_input are required/i);
  });

  it("POST /query should return 400 if user_input is empty string", async () => {
    const res = await request(BASE_URL).post("/api/chatbot/query").send({ user_id: 1, user_input: " " });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_input must be a non-empty string/i);
  });

  it("POST /query should return 200 with fallback response if AI server fails", async () => {
    fetch.mockRejectedValueOnce(new Error("AI server down"));
    chatbotModel.addHistory = jest.fn().mockResolvedValueOnce(true);

    const res = await request(BASE_URL).post("/api/chatbot/query").send({ user_id: 1, user_input: "Hello" });
    expect(res.statusCode).toBe(200);
    expect(res.body.response_text).toMatch(/I understand you're asking about "Hello"/i);
  });

//   it("POST /query should return 200 with AI server response", async () => {
//     fetch.mockResolvedValueOnce({
//       json: jest.fn().mockResolvedValueOnce({ msg: "AI Response" })
//     });
//     chatbotModel.addHistory = jest.fn().mockResolvedValueOnce(true);

//     const res = await request(BASE_URL).post("/api/chatbot/query").send({ user_id: 1, user_input: "Hello" });
//     expect(res.statusCode).toBe(200);
//     expect(res.body.response_text).toBe("AI Response");
//   });

  // -------------------------
  // addURL - /add_urls
  // -------------------------
  it("POST /add_urls should return 400 if urls not provided", async () => {
    const res = await request(BASE_URL).post("/api/chatbot/add_urls").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/urls not found/i);
  });

//   it("POST /add_urls should return 200 if AI server responds", async () => {
//     fetch.mockResolvedValueOnce({
//       json: jest.fn().mockResolvedValueOnce({ success: true })
//     });

//     const res = await request(BASE_URL).post("/api/chatbot/add_urls").send({ urls: "https://example.com" });
//     expect(res.statusCode).toBe(200);
//     expect(res.body.result.success).toBe(true);
//   });

  it("POST /add_urls should return 503 if AI server unavailable", async () => {
    fetch.mockRejectedValueOnce(new Error("Server down"));

    const res = await request(BASE_URL).post("/api/chatbot/add_urls").send({ urls: "https://example.com" });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/AI server unavailable/i);
  });

  // -------------------------
  // addPDF - /add_pdfs
  // -------------------------
  it("POST /add_pdfs should return 200 with dummy response", async () => {
    const res = await request(BASE_URL).post("/api/chatbot/add_pdfs").send({ pdfs: ["file1.pdf"] });
    expect(res.statusCode).toBe(200);
    expect(res.body.result).toMatch(/dummy response/i);
  });

  // -------------------------
  // getChatHistory - /history
  // -------------------------
  it("POST /history should return 400 if user_id missing", async () => {
    const res = await request(BASE_URL).post("/api/chatbot/history").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id is required/i);
  });

//   it("POST /history should return 200 with chat history", async () => {
//     chatbotModel.getHistory = jest.fn().mockResolvedValueOnce([{ user_input: "Hi", chatbot_response: "Hello" }]);
//     const res = await request(BASE_URL).post("/api/chatbot/history").send({ user_id: 1 });
//     expect(res.statusCode).toBe(200);
//     expect(res.body.chat_history.length).toBe(1);
//     expect(res.body.chat_history[0].chatbot_response).toBe("Hello");
//   });

  // -------------------------
  // clearChatHistory - /history DELETE
  // -------------------------
  it("DELETE /history should return 400 if user_id missing", async () => {
    const res = await request(BASE_URL).delete("/api/chatbot/history").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user_id is required/i);
  });

  it("DELETE /history should return 200 if history cleared", async () => {
    chatbotModel.deleteHistory = jest.fn().mockResolvedValueOnce(true);
    const res = await request(BASE_URL).delete("/api/chatbot/history").send({ user_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/cleared successfully/i);
  });

});
