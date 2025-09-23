const fs = require('fs');
const path = require('path');

// Dynamically import Supabase (if available)
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
} catch (error) {
  // Supabase not available, using file-based logging
  console.warn('Supabase not available, using file-based logging');
}

class UnifiedErrorLogService {
  constructor() {
    this.severityLevels = {
      critical: 4,
      warning: 3,
      info: 2,
      minor: 1
    };

    // Configuration options
    this.config = {
      enableDatabaseLogging: !!supabase,
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    // Ensure log directory exists (for file logging)
    this.logDir = path.join(process.cwd(), 'logs');
    if (this.config.enableFileLogging && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Main error logging method - compatible with both branches' interfaces
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
      // Create unified log entry
      const logEntry = this.createUnifiedLogEntry({
        error,
        req,
        res,
        category,
        type,
        additionalContext
      });

      // Execute all logging methods in parallel
      const logPromises = [];
      
      if (this.config.enableDatabaseLogging && supabase) {
        logPromises.push(this.logToDatabase(logEntry));
      }
      
      if (this.config.enableFileLogging) {
        logPromises.push(this.logToFile(logEntry));
      }
      
      if (this.config.enableConsoleLogging) {
        logPromises.push(this.logToConsole(logEntry));
      }

      // Wait for all logging to complete
      const results = await Promise.allSettled(logPromises);

      // Handle real-time alerts for critical errors
      if (category === 'critical') {
        await this.triggerCriticalAlert(logEntry);
      }

      // Return result summary
      return {
        success: true,
        methods: {
          database: this.config.enableDatabaseLogging ? 
            (results[0]?.status === 'fulfilled') : false,
          file: this.config.enableFileLogging ? 
            (results[this.config.enableDatabaseLogging ? 1 : 0]?.status === 'fulfilled') : false,
          console: this.config.enableConsoleLogging
        },
        timestamp: logEntry.timestamp || logEntry.created_at
      };

    } catch (loggingError) {
      console.error('Unified error logging service failed:', loggingError);
      // Fallback emergency logging
      this.emergencyLogging({ error, req, res, category, type, additionalContext });
      return { success: false, error: loggingError };
    }
  }

  /**
   * Create unified log entry format
   */
  createUnifiedLogEntry({ error, req, res, category, type, additionalContext }) {
    const baseEntry = {
      timestamp: new Date().toISOString(),
      message: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack || null,
      code: error?.code || null,
      category,
      type,
      additionalContext
    };

    // If request object is available, add detailed context information (feature of Extended_Middleware_Error_Logging branch)
    if (req) {
      Object.assign(baseEntry, {
        // Database format fields
        error_type: type,
        error_message: baseEntry.message,
        stack_trace: baseEntry.stack,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        request_body: req.body ? JSON.stringify(this.sanitizeRequestBody(req.body)) : null,
        user_id: req.user?.userId || req.user?.id || null,
        ip_address: this.getClientIP(req),
        created_at: baseEntry.timestamp,

        // Extended context information
        request_context: this.extractRequestContext(req),
        user_context: this.extractUserContext(req),
        system_context: this.getSystemContext()
      });
    }

    // If response object is available, add response context
    if (res) {
      baseEntry.response_context = this.extractResponseContext(res);
    }

    return baseEntry;
  }

  /**
   * Database logging (feature of Extended_Middleware_Error_Logging branch)
   */
  async logToDatabase(logEntry) {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const dbEntry = {
      error_type: logEntry.error_type || logEntry.type,
      error_message: logEntry.error_message || logEntry.message,
      stack_trace: logEntry.stack_trace || logEntry.stack,
      endpoint: logEntry.endpoint,
      method: logEntry.method,
      request_body: logEntry.request_body,
      user_id: logEntry.user_id,
      ip_address: logEntry.ip_address,
      created_at: logEntry.created_at || logEntry.timestamp
    };

    const { data, error: insertError } = await supabase
      .from('error_logs')
      .insert([dbEntry])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return data;
  }

  /**
   * File logging (feature of Automated-Security-Assessment-Tool branch)
   */
  async logToFile(logEntry) {
    const fileEntry = {
      timestamp: logEntry.timestamp,
      message: logEntry.message,
      stack: logEntry.stack,
      code: logEntry.code,
      category: logEntry.category,
      type: logEntry.type,
      additionalContext: logEntry.additionalContext
    };

    const logFile = path.join(this.logDir, 'error_log.jsonl');
    const logLine = JSON.stringify(fileEntry) + '\n';
    
    return new Promise((resolve, reject) => {
      fs.appendFile(logFile, logLine, 'utf8', (err) => {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  /**
   * Console logging
   */
  async logToConsole(logEntry) {
    const severity = logEntry.category || 'info';
    const emoji = this.getSeverityEmoji(severity);
    
    console.log(`${emoji} Error logged: ${logEntry.message}`);
    if (logEntry.stack && severity === 'critical') {
      console.error('Stack trace:', logEntry.stack);
    }
    
    return { success: true };
  }

  /**
   * Get emoji corresponding to severity level
   */
  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🚨',
      warning: '⚠️',
      info: '📝',
      minor: '💡'
    };
    return emojis[severity] || '📝';
  }

  /**
   * Emergency logging (last resort when all methods fail)
   */
  emergencyLogging(logData) {
    const timestamp = new Date().toISOString();
    const emergencyMessage = `[${timestamp}] EMERGENCY ERROR LOG: ${JSON.stringify(logData, null, 2)}`;

    // Try to write to emergency log file
    try {
      const emergencyFile = path.join(process.cwd(), 'emergency.log');
      fs.appendFileSync(emergencyFile, emergencyMessage + '\n', 'utf8');
    } catch (e) {
      // If even file writing fails, fallback to console output
      console.error(emergencyMessage);
    }
  }

  // ========== Extended_Middleware_Error_Logging ==========

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

  extractUserContext(req) {
    const user = req.user || {};
    return {
      user_id: user.userId || user.id,
      session_id: req.sessionID || req.headers['x-session-id'],
      user_role: user.role
    };
  }

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

  extractResponseContext(res) {
    return {
      response_status: res.statusCode,
      response_time_ms: res.responseTime || null
    };
  }

  getClientIP(req) {
    if (!req) return null;
    return req.ip || 
      (req.connection && req.connection.remoteAddress) || 
      (req.socket && req.socket.remoteAddress) ||
      (req.connection && req.connection.socket ? req.connection.socket.remoteAddress : null) || null;
  }

  sanitizeHeaders(headers) {
    if (!headers || typeof headers !== 'object') return headers;
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      const key = Object.keys(sanitized).find(k => k.toLowerCase() === header);
      if (key && sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

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

  getCPUUsage() {
    const startUsage = process.cpuUsage();
    setTimeout(() => {
      const usage = process.cpuUsage(startUsage);
      return (usage.user + usage.system) / 1000000;
    }, 100);
  }

  async triggerCriticalAlert(logEntry) {
    console.error('🚨 CRITICAL ERROR ALERT:', {
      message: logEntry.error_message || logEntry.message,
      type: logEntry.error_type || logEntry.type,
      timestamp: logEntry.created_at || logEntry.timestamp,
      user_id: logEntry.user_id,
      url: logEntry.endpoint
    });
  }

  categorizeError(error, context = {}) {
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

  // ========== Configuration Management Methods ==========

  /**
   * Dynamic update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    // If database logging is enabled but Supabase is not available, issue a warning
    if (this.config.enableDatabaseLogging && !supabase) {
      console.warn('Database logging enabled but Supabase client not available');
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Health check - Verify availability of various logging methods
   */
  async healthCheck() {
    const health = {
      database: false,
      file: false,
      console: true, // Console is always available
      overall: false
    };

    // Check database connection
    if (supabase) {
      try {
        const { error } = await supabase.from('error_logs').select('id').limit(1);
        health.database = !error;
      } catch (e) {
        health.database = false;
      }
    }

    // Check file write permissions
    try {
      const testFile = path.join(this.logDir, '.test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      health.file = true;
    } catch (e) {
      health.file = false;
    }

    health.overall = health.database || health.file || health.console;
    
    return health;
  }
}

// Creating a singleton instance
const unifiedErrorLogService = new UnifiedErrorLogService();

// Backward compatibility - support both branches of the calling method
module.exports = unifiedErrorLogService;

// Additional exports to support different import methods
module.exports.logError = unifiedErrorLogService.logError.bind(unifiedErrorLogService);
module.exports.UnifiedErrorLogService = UnifiedErrorLogService;