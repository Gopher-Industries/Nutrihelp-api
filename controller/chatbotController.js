const { aiAndMedical, authAndIdentity, shared } = require('../services');
const logger = require('../utils/logger');

const { chatbotService } = aiAndMedical;
const { serviceError } = authAndIdentity;
const { isServiceError } = serviceError;
const { createErrorResponse } = shared.apiResponse;

function serviceErrorToPayload(error) {
  return createErrorResponse(
    error.message,
    error.statusCode >= 500 ? 'CHATBOT_REQUEST_FAILED' : 'VALIDATION_ERROR',
    process.env.NODE_ENV === 'development' ? error.details : undefined
  );
}

function handleUnexpectedError(res, label, error, context = {}) {
  logger.error(label, { error: error.message, ...context });
  return res.status(500).json(
    createErrorResponse(
      'Internal server error',
      'CHATBOT_INTERNAL_ERROR',
      process.env.NODE_ENV === 'development' ? { message: error.message } : undefined
    )
  );
}

function resolveChatbotUserId(req) {
  const requestUserId = req.body?.user_id || req.query?.user_id;
  const currentUserId = req.user?.userId;
  const role = String(req.user?.role || '').toLowerCase();

  if ((role === 'admin' || role === 'nutritionist') && requestUserId) {
    return requestUserId;
  }

  return currentUserId;
}

async function getChatResponse(req, res) {
  try {
    const userId = resolveChatbotUserId(req);
    const result = await chatbotService.getChatResponse({
      userId,
      userInput: req.body.user_input
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error in chatbot response', error, {
      userId: resolveChatbotUserId(req)
    });
  }
}

async function addURL(req, res) {
  try {
    const result = await chatbotService.addUrl(req.body.urls);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error processing URL', error, {
      urls: req.body.urls
    });
  }
}

async function addPDF(req, res) {
  try {
    const result = await chatbotService.addPdf(req.body.pdfs);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error processing PDF', error);
  }
}

async function getChatHistory(req, res) {
  try {
    const userId = resolveChatbotUserId(req);
    const result = await chatbotService.getChatHistory(userId);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error retrieving chat history', error, {
      userId: resolveChatbotUserId(req)
    });
  }
}

async function clearChatHistory(req, res) {
  try {
    const userId = resolveChatbotUserId(req);
    const result = await chatbotService.clearChatHistory(userId);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error clearing chat history', error, {
      userId: resolveChatbotUserId(req)
    });
  }
}

module.exports = {
  getChatResponse,
  addURL,
  addPDF,
  getChatHistory,
  clearChatHistory
};
