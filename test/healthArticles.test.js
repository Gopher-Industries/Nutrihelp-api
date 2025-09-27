require('dotenv').config();
const request = require('supertest');
const express = require('express');
const healthArticleRouter = require('../routes/articles');

// Mock Express app
const app = express();
app.use('/api/health-articles', healthArticleRouter);

const getHealthArticles = require('../model/getHealthArticles');

// Mocking the model
jest.mock('../model/getHealthArticles');

describe('Health Articles API', () => {
  const sampleArticles = [
    { id: 1, title: 'Health Benefits of Apples', tags: ['fruits', 'nutrition'] },
    { id: 2, title: 'How Exercise Improves Mental Health', tags: ['exercise', 'mental'] },
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================== GET ENDPOINT ==================
  describe('GET /api/health-articles', () => {
    it('should return 400 if query parameter is missing', async () => {
      const res = await request(app).get('/api/health-articles');
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing query parameter');
    });

    it('should return 200 and articles if query parameter is provided', async () => {
      getHealthArticles.mockResolvedValue(sampleArticles);

      const res = await request(app).get('/api/health-articles').query({ query: 'health' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('articles');
      expect(Array.isArray(res.body.articles)).toBe(true);
      expect(res.body.articles.length).toBe(sampleArticles.length);
      expect(res.body.articles[0]).toHaveProperty('title');
    });

    it('should return an empty array if no articles match', async () => {
      getHealthArticles.mockResolvedValue([]);

      const res = await request(app).get('/api/health-articles').query({ query: 'nonexistent' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('articles');
      expect(res.body.articles).toEqual([]);
    });

    it('should return 500 if model throws an error', async () => {
      getHealthArticles.mockImplementation(() => {
        throw new Error('Database error');
      });

      const res = await request(app).get('/api/health-articles').query({ query: 'health' });
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Internal server error');
    });
  });
});
