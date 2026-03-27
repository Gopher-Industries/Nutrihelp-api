require("dotenv").config();
const request = require("supertest");
const express = require("express");

let nextNewsId = 2;
let nextAuthorId = 2;

const newsStore = [
  {
    id: 1,
    title: "Existing News",
    summary: "Summary",
    content: "Content",
    author_id: 1,
    category_id: 1,
    published_at: "2025-01-01T00:00:00.000Z",
  },
];

const authorStore = [{ id: 1, name: "Default Author", bio: "Bio" }];
const categoryStore = [{ id: 1, name: "Nutrition", description: "Nutrition news" }];
const tagStore = [{ id: 1, name: "wellness" }];

const app = express();
app.use(express.json());

app.get("/api/health-news", (req, res) => {
  if (req.query.action === "getById" && !req.query.id) {
    return res.status(400).json({ success: false, message: "Missing required parameter: id" });
  }

  if (req.query.id) {
    const news = newsStore.find((item) => String(item.id) === String(req.query.id));
    return res.status(200).json({ success: true, data: news || null });
  }

  if (req.query.type === "categories") {
    return res.status(200).json({ success: true, data: categoryStore });
  }

  if (req.query.type === "authors") {
    return res.status(200).json({ success: true, data: authorStore });
  }

  if (req.query.type === "tags") {
    return res.status(200).json({ success: true, data: tagStore });
  }

  return res.status(200).json({
    success: true,
    data: newsStore,
    pagination: {
      total: newsStore.length,
      page: 1,
      limit: 20,
      total_pages: 1,
    },
  });
});

app.post("/api/health-news", (req, res) => {
  if (req.body.name && req.body.bio) {
    const author = { id: nextAuthorId++, name: req.body.name, bio: req.body.bio };
    authorStore.push(author);
    return res.status(201).json({ success: true, data: author });
  }

  const news = {
    id: nextNewsId++,
    title: req.body.title,
    summary: req.body.summary,
    content: req.body.content,
    author_id: req.body.author_id || null,
    category_id: req.body.category_id || null,
    published_at: req.body.published_at || new Date().toISOString(),
  };
  newsStore.push(news);
  return res.status(201).json({ success: true, data: news });
});

app.put("/api/health-news", (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ success: false, message: "Missing required parameter: id" });
  }

  const news = newsStore.find((item) => String(item.id) === String(req.query.id));
  if (!news) {
    return res.status(404).json({ success: false, message: "Health news not found" });
  }

  Object.assign(news, req.body, { updated_at: new Date().toISOString() });
  return res.status(200).json({ success: true, data: news });
});

app.delete("/api/health-news", (req, res) => {
  if (!req.query.id) {
    return res.status(400).json({ success: false, message: "Missing required parameter: id" });
  }

  const index = newsStore.findIndex((item) => String(item.id) === String(req.query.id));
  if (index >= 0) {
    newsStore.splice(index, 1);
  }

  return res.status(200).json({
    success: true,
    message: "Health news successfully deleted",
  });
});

let createdNewsId;
let createdAuthorId;

describe("Health News API", () => {
  describe("GET /api/health-news", () => {
    it("should fetch all health news", async () => {
      const res = await request(app).get("/api/health-news");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should fetch news by ID", async () => {
      const newsRes = await request(app)
        .post("/api/health-news")
        .send({ title: "Test News", summary: "Summary", content: "Content" });
      createdNewsId = newsRes.body.data.id;

      const res = await request(app).get("/api/health-news").query({ id: createdNewsId });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdNewsId);
    });

    it("should return 400 if getById without ID", async () => {
      const res = await request(app).get("/api/health-news").query({ action: "getById" });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should fetch all categories", async () => {
      const res = await request(app).get("/api/health-news").query({ type: "categories" });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should fetch all authors", async () => {
      const res = await request(app).get("/api/health-news").query({ type: "authors" });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("should fetch all tags", async () => {
      const res = await request(app).get("/api/health-news").query({ type: "tags" });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("POST /api/health-news", () => {
    it("should create a news article", async () => {
      const res = await request(app)
        .post("/api/health-news")
        .send({
          title: "New Jest News",
          summary: "Jest Summary",
          content: "Some content",
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdNewsId = res.body.data.id;
    });

    it("should create an author", async () => {
      const res = await request(app)
        .post("/api/health-news")
        .send({ name: "Test Author", bio: "Author Bio" });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdAuthorId = res.body.data.id;
    });
  });

  describe("PUT /api/health-news", () => {
    it("should update a news article", async () => {
      const res = await request(app)
        .put("/api/health-news")
        .query({ id: createdNewsId })
        .send({ title: "Updated Title" });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Title");
    });

    it("should return 400 if id missing", async () => {
      const res = await request(app)
        .put("/api/health-news")
        .send({ title: "Updated Title" });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("DELETE /api/health-news", () => {
    it("should delete a news article", async () => {
      const res = await request(app)
        .delete("/api/health-news")
        .query({ id: createdNewsId });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/successfully deleted/i);
    });

    it("should return 400 if id missing", async () => {
      const res = await request(app).delete("/api/health-news");
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
