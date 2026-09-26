/**
 * Health Tools controller tests.
 */

const express = require('express');
const request = require('supertest');

const router = require('../routes/healthTools');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/health-tools', router);
  return app;
}

describe('GET /api/health-tools', () => {
  test('returns the catalogue', async () => {
    const res = await request(makeApp()).get('/api/health-tools');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.tools)).toBe(true);
    expect(res.body.data.tools.length).toBeGreaterThan(0);
    expect(res.body.data.tools[0]).toHaveProperty('id');
    expect(res.body.data.tools[0]).toHaveProperty('endpoint');
  });

  test('filters by category', async () => {
    const res = await request(makeApp()).get('/api/health-tools?category=hydration');
    expect(res.status).toBe(200);
    res.body.data.tools.forEach((t) =>
      expect(t.category.toLowerCase()).toBe('hydration')
    );
  });
});

describe('GET /api/health-tools/bmi', () => {
  test('rejects invalid input', async () => {
    const res = await request(makeApp()).get('/api/health-tools/bmi');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('HEALTH_TOOLS_BMI_INVALID_INPUT');
  });

  test('rejects out-of-range input', async () => {
    const res = await request(makeApp())
      .get('/api/health-tools/bmi')
      .query({ height: 5, weight: 70 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('HEALTH_TOOLS_BMI_INVALID_INPUT');
  });

  test('computes BMI and category', async () => {
    const res = await request(makeApp())
      .get('/api/health-tools/bmi')
      .query({ height: 1.75, weight: 70 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bmi).toBeCloseTo(22.86, 2);
    expect(res.body.data.category).toBe('Normal weight');
    expect(res.body.data.recommendedWaterIntakeMl).toBe(2450);
  });
});
