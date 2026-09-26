/**
 * tests/smoke.test.js
 * Basic smoke tests using Jest + Supertest (read-only).
 * Assumes server exports express app (module.exports = app).
 *
 * Run with: NODE_ENV=test npm test
 */
const request = require('supertest');
const app = require('../server');

describe('Smoke tests - basic endpoints', () => {
  jest.setTimeout(20000);

  test('GET /api/recipes?user_id=15 returns JSON with success key', async () => {
    const res = await request(app).get('/api/recipes').query({ user_id: 15 });
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('success');
  });

  test('GET /api/fooddata returns JSON with success key', async () => {
    const res = await request(app).get('/api/fooddata');
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('success');
  });

  test('GET /api/recipe/nutrition?name=apple returns JSON with success key', async () => {
    const res = await request(app).get('/api/recipe/nutrition').query({ name: 'apple' });
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('success');
  });
});
