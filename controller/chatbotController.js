const { chatbotService } = require('../services/chatbotService');
const { isServiceError } = require('../services/serviceError');

function serviceErrorToPayload(error) {
  return {
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && error.details ? { details: error.details } : {})
  };
}

function handleUnexpectedError(res, label, error) {
  console.error(`${label}:`, error);
  return res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}

async function getChatResponse(req, res) {
  try {
    const result = await chatbotService.getChatResponse({
      userId: req.body.user_id,
      userInput: req.body.user_input
    });
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error in chatbot response', error);
  }
}

async function addURL(req, res) {
  try {
    const result = await chatbotService.addUrl(req.body.urls);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return handleUnexpectedError(res, 'Error processing URL', error);
  }
}

async function addPDF(req, res) {
  try {
    const result = await chatbotService.addPdf(req.body.pdfs);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return handleUnexpectedError(res, 'Error in chatbot response', error);
  }
}

async function getChatHistory(req, res) {
  try {
    const result = await chatbotService.getChatHistory(req.body.user_id);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error retrieving chat history', error);
  }
}

async function clearChatHistory(req, res) {
  try {
    const result = await chatbotService.clearChatHistory(req.body.user_id);
    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    if (isServiceError(error)) {
      return res.status(error.statusCode).json(serviceErrorToPayload(error));
    }

    return handleUnexpectedError(res, 'Error clearing chat history', error);
  }
}

module.exports = {
  getChatResponse,
  addURL,
  addPDF,
  getChatHistory,
  clearChatHistory
};
