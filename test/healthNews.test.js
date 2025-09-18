require("dotenv").config();
const request = require('supertest');

const BASE_URL = "http://localhost:80";


let createdNewsId;
let createdCategoryId;
let createdAuthorId;
let createdTagId;

describe('Health News API', () => {

  // ================== GET ENDPOINTS ==================
  describe('GET /api/health-news', () => {

    it('should fetch all health news', async () => {
      const res = await request(BASE_URL).get('/api/health-news');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should fetch news by ID', async () => {
      // First create a news item to get by ID
      const newsRes = await request(BASE_URL)
        .post('/api/health-news')
        .send({ title: 'Test News', summary: 'Summary', content: 'Content' });
      createdNewsId = newsRes.body.data.id;

      const res = await request(BASE_URL).get('/api/health-news').query({ id: createdNewsId });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdNewsId);
    });

    // it('should fetch news by category', async () => {
    //   const res = await request(BASE_URL).get('/api/health-news').query({ categoryId: createdCategoryId || 1 });
    //   expect(res.statusCode).toBe(200);
    //   expect(res.body.success).toBe(true);
    //   expect(Array.isArray(res.body.data)).toBe(true);
    // });

    // it('should fetch news by author', async () => {
    //   const res = await request(BASE_URL).get('/api/health-news').query({ authorId: createdAuthorId || 1 });
    //   expect(res.statusCode).toBe(200);
    //   expect(res.body.success).toBe(true);
    //   expect(Array.isArray(res.body.data)).toBe(true);
    // });

    // it('should fetch news by tag', async () => {
    //   const res = await request(BASE_URL).get('/api/health-news').query({ tagId: createdTagId || 1 });
    //   expect(res.statusCode).toBe(200);
    //   expect(res.body.success).toBe(true);
    //   expect(Array.isArray(res.body.data)).toBe(true);
    // });

    it('should return 400 if getById without ID', async () => {
      const res = await request(BASE_URL).get('/api/health-news').query({ action: 'getById' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fetch all categories', async () => {
      const res = await request(BASE_URL).get('/api/health-news').query({ type: 'categories' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should fetch all authors', async () => {
      const res = await request(BASE_URL).get('/api/health-news').query({ type: 'authors' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should fetch all tags', async () => {
      const res = await request(BASE_URL).get('/api/health-news').query({ type: 'tags' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ================== POST ENDPOINTS ==================
  describe('POST /api/health-news', () => {

    it('should create a news article', async () => {
      const res = await request(BASE_URL)
        .post('/api/health-news')
        .send({
          title: 'New Jest News',
          summary: 'Jest Summary',
          content: 'Some content',
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdNewsId = res.body.data.id;
    });

    // it('should create a category', async () => {
    //   const res = await request(BASE_URL)
    //     .post('/api/health-news')
    //     .send({ name: 'Test Category', description: 'Category Desc' });
    //   expect(res.statusCode).toBe(201);
    //   expect(res.body.success).toBe(true);
    //   createdCategoryId = res.body.data.id;
    // });

    it('should create an author', async () => {
      const res = await request(BASE_URL)
        .post('/api/health-news')
        .send({ name: 'Test Author', bio: 'Author Bio' });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdAuthorId = res.body.data.id;
    });

    // it('should create a tag', async () => {
    //   const res = await request(BASE_URL)
    //     .post('/api/health-news')
    //     .send({ name: 'Test Tag' });
    //   expect(res.statusCode).toBe(201);
    //   expect(res.body.success).toBe(true);
    //   createdTagId = res.body.data.id;
    // });
  });

  // ================== PUT ENDPOINT ==================
  describe('PUT /api/health-news', () => {
    it('should update a news article', async () => {
      const res = await request(BASE_URL)
        .put('/api/health-news')
        .query({ id: createdNewsId })
        .send({ title: 'Updated Title' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should return 400 if id missing', async () => {
      const res = await request(BASE_URL)
        .put('/api/health-news')
        .send({ title: 'Updated Title' });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ================== DELETE ENDPOINT ==================
  describe('DELETE /api/health-news', () => {
    it('should delete a news article', async () => {
      const res = await request(BASE_URL)
        .delete('/api/health-news')
        .query({ id: createdNewsId });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/successfully deleted/i);
    });

    it('should return 400 if id missing', async () => {
      const res = await request(BASE_URL).delete('/api/health-news');
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
