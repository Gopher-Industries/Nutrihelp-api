/**
 * User Feedback controller tests.
 */

jest.mock('../model/addUserFeedback.js', () => jest.fn());
jest.mock('../middleware/rateLimiter', () => ({
  formLimiter: (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');

const addUserFeedback = require('../model/addUserFeedback.js');
const router = require('../routes/userfeedback');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/userfeedback', router);
  return app;
}

const VALID_PAYLOAD = {
  user_id: 1,
  name: 'Jane Doe',
  contact_number: '+61400000000',
  email: 'jane@example.com',
  experience: 'Really smooth experience overall.',
  message: 'Loving the app so far.',
};

describe('POST /api/userfeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addUserFeedback.mockResolvedValue({ id: 1 });
  });

  test('persists feedback and returns standardized envelope', async () => {
    const res = await request(makeApp()).post('/api/userfeedback').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.received).toBe(true);
    expect(addUserFeedback).toHaveBeenCalledTimes(1);
  });

  test('returns 500 on persistence failure', async () => {
    addUserFeedback.mockRejectedValueOnce(new Error('db down'));
    const res = await request(makeApp()).post('/api/userfeedback').send(VALID_PAYLOAD);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_FEEDBACK_FAILED');
  });
});
