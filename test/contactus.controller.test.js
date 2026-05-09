/**
 * Contact Us controller tests.
 *
 * We mount only the contactus router on a fresh express app so we don't
 * boot the full server (which has DB/AI/SMTP side-effects). Email + DB
 * model are mocked so these tests are fully hermetic.
 */

jest.mock('../model/addContactUsMsg.js', () => jest.fn());
jest.mock('../utils/emailService', () => ({
  sendSupportNotification: jest.fn().mockResolvedValue({ messageId: 'mock-support' }),
  sendContactAcknowledgement: jest.fn().mockResolvedValue({ messageId: 'mock-ack' }),
  isSmtpConfigured: jest.fn().mockReturnValue(false),
}));
// Bypass rate limiter for tests
jest.mock('../middleware/rateLimiter', () => ({
  formLimiter: (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');

const addContactUsMsg = require('../model/addContactUsMsg.js');
const emailService = require('../utils/emailService');
const contactusRouter = require('../routes/contactus');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/contactus', contactusRouter);
  return app;
}

const VALID_PAYLOAD = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Hello there',
  message: 'I would love to learn more about your meal planner.',
};

describe('POST /api/contactus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addContactUsMsg.mockResolvedValue({ id: 1 });
  });

  test('rejects missing fields with 400 + validation envelope', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/contactus')
      .send({ name: '', email: 'not-an-email', subject: '', message: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details.fields)).toBe(true);
    expect(res.body.error.details.fields.length).toBeGreaterThan(0);
    expect(addContactUsMsg).not.toHaveBeenCalled();
    expect(emailService.sendSupportNotification).not.toHaveBeenCalled();
  });

  test('persists message and dispatches both emails on success', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/contactus').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.received).toBe(true);
    expect(res.body.data.email.supportNotified).toBe(true);
    expect(res.body.data.email.acknowledgementSent).toBe(true);

    expect(addContactUsMsg).toHaveBeenCalledTimes(1);
    expect(emailService.sendSupportNotification).toHaveBeenCalledWith(
      expect.objectContaining({ email: VALID_PAYLOAD.email })
    );
    expect(emailService.sendContactAcknowledgement).toHaveBeenCalledWith(
      expect.objectContaining({ email: VALID_PAYLOAD.email })
    );
  });

  test('returns 500 if persistence fails (and skips emails)', async () => {
    addContactUsMsg.mockRejectedValueOnce(new Error('db down'));

    const app = makeApp();
    const res = await request(app).post('/api/contactus').send(VALID_PAYLOAD);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONTACT_REQUEST_FAILED');
    expect(emailService.sendSupportNotification).not.toHaveBeenCalled();
    expect(emailService.sendContactAcknowledgement).not.toHaveBeenCalled();
  });

  test('still returns 201 when email transport rejects', async () => {
    emailService.sendSupportNotification.mockRejectedValueOnce(new Error('smtp down'));
    emailService.sendContactAcknowledgement.mockRejectedValueOnce(new Error('smtp down'));

    const app = makeApp();
    const res = await request(app).post('/api/contactus').send(VALID_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email.supportNotified).toBe(false);
    expect(res.body.data.email.acknowledgementSent).toBe(false);
  });
});
