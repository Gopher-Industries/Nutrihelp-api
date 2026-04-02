const loginService = require('../services/loginService');
const { isServiceError } = require('../services/serviceError');

function getRequestContext(req) {
  return {
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip,
    userAgent: req.get('User-Agent') || req.headers['user-agent'] || ''
  };
}

function handleError(res, error, fallbackMessage) {
  if (isServiceError(error)) {
    if (error.details?.warningOnly) {
      return res.status(error.statusCode).json({ warning: error.message });
    }

    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(fallbackMessage, error);
  return res.status(500).json({ error: 'Internal server error' });
}

async function login(req, res) {
  try {
    const result = await loginService.login({
      email: req.body.email,
      password: req.body.password,
      ...getRequestContext(req)
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleError(res, error, 'Login error:');
  }
}

async function loginMfa(req, res) {
  try {
    const result = await loginService.loginMfa({
      email: req.body.email,
      password: req.body.password,
      mfaToken: req.body.mfa_token
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleError(res, error, 'MFA login error:');
  }
}

module.exports = { login, loginMfa };
