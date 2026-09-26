const request = require('supertest');
// Adjust this path if your main app entry is different (e.g., ../app.js)
const app = require('../server'); 

describe('Recipe API Endpoints', () => {
  
  describe('GET /api/recipes', () => {
    it('should return 400 if user_id is missing', async () => {
      const res = await request(app).get('/api/recipes');
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 200 and an array for a valid user_id', async () => {
      const res = await request(app).get('/api/recipes?user_id=15');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.recipes)).toBe(true);
    });
  });

  describe('POST /api/recipes validation', () => {
    it('should return 400 for empty payload (Joi validation)', async () => {
      const res = await request(app)
        .post('/api/recipes')
        .send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toContain('"user_id" is required');
    });
  });

  describe('DELETE /api/recipes validation', () => {
    it('should return 400 if recipe_id is missing', async () => {
      const res = await request(app)
        .delete('/api/recipes')
        .send({ user_id: 15 });
      expect(res.statusCode).toEqual(400);
      expect(res.body.details).toContain('"recipe_id" is required');
    });
  });
});
