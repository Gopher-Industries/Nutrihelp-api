/**
 * FAQ controller tests.
 *
 * Verifies seed fallback when Supabase has no rows / errors, and that the
 * envelope shape is what the frontend expects.
 *
 * Mock variable names are prefixed with `mock` so Jest's `jest.mock`
 * factory can reference them (this is the documented escape hatch).
 */

const mockEq = jest.fn();
const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock('../dbConnection.js', () => ({
  from: (...args) => mockFrom(...args),
}));

const express = require('express');
const request = require('supertest');
const faqRouter = require('../routes/faq');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/faq', faqRouter);
  return app;
}

function setDbResponse({ data = null, error = null } = {}) {
  // eq() is the terminal awaited node in the chain.
  mockEq.mockReturnValueOnce(Promise.resolve({ data, error }));
}

describe('GET /api/faq', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEq.mockReset();
    // Re-establish chain after reset.
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  test('falls back to seed when Supabase returns no rows', async () => {
    setDbResponse({ data: [] });
    const res = await request(makeApp()).get('/api/faq');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.source).toBe('seed');
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    expect(res.body.meta.count).toBe(res.body.data.items.length);
  });

  test('falls back to seed on Supabase error', async () => {
    setDbResponse({ data: null, error: { message: 'permission denied' } });
    const res = await request(makeApp()).get('/api/faq');

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('seed');
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  test('returns DB rows when present', async () => {
    setDbResponse({
      data: [
        {
          id: 'a1',
          question: 'Live Q?',
          answer: 'Live A.',
          category: 'Live',
          sort_order: 0,
          is_published: true,
        },
      ],
    });

    const res = await request(makeApp()).get('/api/faq');
    expect(res.body.data.source).toBe('db');
    expect(res.body.data.items[0].question).toBe('Live Q?');
  });

  test('honours category filter', async () => {
    setDbResponse({ data: [] });
    const res = await request(makeApp()).get('/api/faq?category=support');

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('seed');
    expect(res.body.data.items.length).toBeGreaterThan(0);
    res.body.data.items.forEach((item) =>
      expect(item.category.toLowerCase()).toBe('support')
    );
  });
});
