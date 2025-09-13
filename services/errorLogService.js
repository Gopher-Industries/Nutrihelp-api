const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

class ErrorLogService {
  constructor() {
    this.severityLevels = {
      critical: 4,
      warning: 3,
      info: 2,
      minor: 1
    };
  }

  /** Record error logs
   */
  async logError({
    error,
    req = null,
    res = null,
    category = 'warning',
    type = 'system',
    additionalContext = {}
  }) {
    try {
      const logEntry = {
        error_type: type,
        error_message: error.message || error.toString(),
        stack_trace: error.stack,
        endpoint: req?.originalUrl || req?.url,
        method: req?.method,
        request_body: req?.body ? JSON.stringify(this.sanitizeRequestBody(req.body)) : null,
        user_id: req?.user?.userId || null,
        ip_address: this.getClientIP(req),
        created_at: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('error_logs')
        .insert([logEntry])
        .select()
        .single();

      if (insertError) {
        console.error('Failed to log error:', insertError);
        // Fallback logging to file or console
        this.fallbackLogging(logEntry);
      }

      // Real-time alerting for critical errors
      if (category === 'critical') {
        await this.triggerCriticalAlert(logEntry);
      }

      return data;
    } catch (loggingError) {
      console.error('Error logging service failed:', loggingError);
      this.fallbackLogging({ error, req, res, category, type });
    }
  }

  /**
   * Extract request context
   */
  extractRequestContext(req) {
    return {
      request_id: req.id || req.headers['x-request-id'],
      request_method: req.method,
      request_url: req.originalUrl || req.url,
      request_origin: req.headers.origin || req.headers.referer,
      request_user_agent: req.headers['user-agent'],
      request_ip_address: this.getClientIP(req),
      request_headers: this.sanitizeHeaders(req.headers),
      request_body: this.sanitizeRequestBody(req.body)
    };
  }

  /**
   * Extract user context
   */
  extractUserContext(req) {
    const user = req.user || {};
    return {
      user_id: user.userId || user.id,
      session_id: req.sessionID || req.headers['x-session-id'],
      user_role: user.role
    };
  }

  /**
   * Get system context
   */
  getSystemContext() {
    const memUsage = process.memoryUsage();
    return {
      server_instance: process.env.SERVER_INSTANCE || 'unknown',
      node_env: process.env.NODE_ENV,
      memory_usage: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu_usage: process.cpuUsage ? this.getCPUUsage() : null
    };
  }

  /**
   * Extract response context
   */
  extractResponseContext(res) {
    return {
      response_status: res.statusCode,
      response_time_ms: res.responseTime || null
    };
  }

  /**
   * Get client IP
   */
  getClientIP(req) {
    if (!req) return null;
    return req.ip || 
      (req.connection && req.connection.remoteAddress) || 
      (req.socket && req.socket.remoteAddress) ||
      (req.connection && req.connection.socket ? req.connection.socket.remoteAddress : null) || null;
  }

  /**
   * Sanitize sensitive request headers
   */
  sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return headers;
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      // header keys may be in different cases
      const key = Object.keys(sanitized).find(k => k.toLowerCase() === header);
      if (key && sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize sensitive request body
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get CPU usage
   */
  getCPUUsage() {
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const usage = process.cpuUsage(startUsage);
      return (usage.user + usage.system) / 1000000; // Convert to seconds
    }, 100);
  }

  /**
   * Trigger critical error alert
   */
  async triggerCriticalAlert(logEntry) {
    // Here you can integrate email, Slack, SMS and other alert mechanisms
    console.error('🚨 CRITICAL ERROR ALERT:', {
      message: logEntry.error_message,
      type: logEntry.error_type,
      timestamp: new Date().toISOString(),
      user_id: logEntry.user_id,
      url: logEntry.request_url
    });

    // You can add more alerting logic here
    // await this.sendSlackAlert(logEntry);
    // await this.sendEmailAlert(logEntry);
  }

  /**
   * Fallback logging
   */
  fallbackLogging(logData) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] FALLBACK ERROR LOG:`, JSON.stringify(logData, null, 2));
  }

  /**
   * Error classification
   */
  categorizeError(error, context = {}) {
    // Automatically categorize based on error type and context
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('database') ||
        error.code === 'ENOTFOUND') {
      return { category: 'critical', type: 'database' };
    }
    
    if (error.status === 401 || error.status === 403) {
      return { category: 'warning', type: 'authentication' };
    }
    
    if (error.status >= 400 && error.status < 500) {
      return { category: 'info', type: 'validation' };
    }
    
    if (error.status >= 500) {
      return { category: 'critical', type: 'system' };
    }
    
    return { category: 'warning', type: 'system' };
  }
}

module.exports = new ErrorLogService();
