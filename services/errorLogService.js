const fs = require('fs');
const path = require('path');

module.exports = {
  async logError({ error, category = 'error', type = 'system', additionalContext = {} } = {}) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        code: error && error.code ? error.code : null,
        category,
        type,
        additionalContext
      };

      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const file = path.join(logDir, 'error_log.jsonl');
      fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');

      console.log(`📝 Error logged: ${entry.message}`);
      return { success: true };
    } catch (e) {
      console.error('Failed to log error:', e);
      return { success: false, error: e };
    }
  }
};
