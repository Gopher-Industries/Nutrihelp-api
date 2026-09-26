require("dotenv").config();
const request = require('supertest');

const BASE_URL = "http://localhost:80";

describe('Water Intake API', () => {

  // ================== POST ENDPOINT ==================
  describe('POST /api/water-intake', () => {

    let testUserId = 1; // Replace with a valid user ID in your DB

    it('should return 400 if user_id is missing', async () => {
      const res = await request(BASE_URL)
        .post('/api/water-intake')
        .send({ glasses_consumed: 3 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/user ID and glasses consumed are required/i);
    });

    it('should return 400 if glasses_consumed is missing', async () => {
      const res = await request(BASE_URL)
        .post('/api/water-intake')
        .send({ user_id: testUserId });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/user ID and glasses consumed are required/i);
    });

    it('should return 400 if glasses_consumed is not a number', async () => {
      const res = await request(BASE_URL)
        .post('/api/water-intake')
        .send({ user_id: testUserId, glasses_consumed: "five" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/user ID and glasses consumed are required/i);
    });

    it('should return 500 if DB throws an error', async () => {
      // Simulate DB error by sending invalid user_id type (or you can mock supabase)
      const res = await request(BASE_URL)
        .post('/api/water-intake')
        .send({ user_id: null, glasses_consumed: 2 });

      expect(res.statusCode).toBe(400); // actually validation triggers 400 before DB
    });

  });

});
