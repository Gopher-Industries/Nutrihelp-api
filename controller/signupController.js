const signupService = require('../services/signupService');
const { isServiceError } = require('../services/serviceError');

function getRequestContext(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '',
    userAgent: req.get('User-Agent') || ''
  };
}

async function signup(req, res) {
  try {
    const result = await signupService.signup({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      contactNumber: req.body.contact_number,
      address: req.body.address,
      ...getRequestContext(req)
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      const payload = error.details?.code
        ? { code: error.details.code, error: error.message }
        : { error: error.message };

      return res.status(error.statusCode).json(payload);
    }

    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup };
