// security/securityChecklist.js
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class SecurityChecklist {
  constructor() {
    this.checks = [
      'certificateExpiry',
      'securityHeaders',
      'dependencyVulnerabilities',
      'authenticationSecurity',
      'databaseSecurity',
      'apiSecurity',
      'environmentSecurity',
      'accessControlChecks'
    ];
  }

/**
 * Run a full security assessment
 */
  async runSecurityAssessment() {
    const results = {
      timestamp: new Date().toISOString(),
      overall_score: 0,
      total_checks: this.checks.length,
      passed_checks: 0,
      failed_checks: 0,
      warnings: 0,
      critical_issues: 0,
      checks: {}
    };

    console.log('🔒 Starting Security Assessment...');

    for (const checkName of this.checks) {
      try {
        console.log(`  ✓ Running ${checkName}...`);
        const checkResult = await this[checkName]();
        results.checks[checkName] = checkResult;
        
        if (checkResult.status === 'pass') results.passed_checks++;
        else if (checkResult.status === 'fail') results.failed_checks++;
        else if (checkResult.status === 'warning') results.warnings++;
        
        if (checkResult.severity === 'critical') results.critical_issues++;
        
      } catch (error) {
        console.error(`  ✗ Error in ${checkName}:`, error.message);
        results.checks[checkName] = {
          status: 'error',
          message: error.message,
          severity: 'high'
        };
        results.failed_checks++;
      }
    }

    // Calculate overall security score
    results.overall_score = Math.round(
      (results.passed_checks / results.total_checks) * 100
    );

    return results;
  }

/**
 * Check SSL certificate expiry
 */
  async certificateExpiry() {
    return new Promise((resolve) => {
      const domain = process.env.DOMAIN || 'localhost';
      const port = process.env.HTTPS_PORT || 443;

    // Skip this check if running in local development environment
      if (domain === 'localhost' || process.env.NODE_ENV === 'development') {
        return resolve({
          status: 'skip',
          message: 'Certificate check skipped for development environment',
          severity: 'low'
        });
      }

      const options = {
        hostname: domain,
        port: port,
        method: 'GET',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 7) {
          resolve({
            status: 'fail',
            message: `Certificate expires in ${daysUntilExpiry} days`,
            severity: 'critical',
            details: { expiry_date: expiryDate, days_remaining: daysUntilExpiry }
          });
        } else if (daysUntilExpiry < 30) {
          resolve({
            status: 'warning',
            message: `Certificate expires in ${daysUntilExpiry} days`,
            severity: 'medium',
            details: { expiry_date: expiryDate, days_remaining: daysUntilExpiry }
          });
        } else {
          resolve({
            status: 'pass',
            message: `Certificate valid for ${daysUntilExpiry} days`,
            severity: 'low',
            details: { expiry_date: expiryDate, days_remaining: daysUntilExpiry }
          });
        }
      });

      req.on('error', () => {
        resolve({
          status: 'fail',
          message: 'Unable to check certificate',
          severity: 'medium'
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'fail',
          message: 'Certificate check timeout',
          severity: 'medium'
        });
      });

      req.end();
    });
  }

/**
 * Check security response headers
 */
  async securityHeaders() {
    const requiredHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000',
      'Content-Security-Policy': true,
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    // Perform real HTTP(S) requests to configured API endpoints and validate response headers.
    // Configuration:
    //   process.env.SECURITY_CHECK_ENDPOINTS - comma-separated list of URLs (e.g. https://api.example.com/, http://localhost:3000/)
    // Fallback: http://localhost:3000/
    const endpointsEnv = process.env.SECURITY_CHECK_ENDPOINTS || 'http://localhost:3000/';
    const endpoints = endpointsEnv.split(',').map(s => s.trim()).filter(Boolean);

    const results = [];

    const checkSingle = (urlStr) => new Promise((resolve) => {
      try {
        const urlObj = new URL(urlStr);
        const isHttps = urlObj.protocol === 'https:';
        const lib = isHttps ? https : http;
        const options = {
          method: 'HEAD', // HEAD is sufficient to get headers
          hostname: urlObj.hostname,
          port: urlObj.port || (isHttps ? 443 : 80),
          path: urlObj.pathname || '/',
          timeout: 5000
        };

        const req = lib.request(options, (res) => {
          const headers = {};
          for (const [k, v] of Object.entries(res.headers)) headers[k.toLowerCase()] = v;

          const missing = [];
          const warnings = [];

          // Check required headers presence/value
          for (const [h, expected] of Object.entries(requiredHeaders)) {
            const key = h.toLowerCase();
            if (!headers[key]) {
              missing.push(h);
            } else if (expected === true) {
              // any value acceptable
            } else if (typeof expected === 'string') {
              if (!headers[key] || !headers[key].toLowerCase().includes(expected.toLowerCase())) {
                warnings.push(`${h} value unexpected`);
              }
            }
          }

          const status = missing.length > 0 ? 'fail' : (warnings.length > 0 ? 'warning' : 'pass');
          const severity = status === 'fail' ? 'high' : (status === 'warning' ? 'medium' : 'low');

          resolve({ url: urlStr, status, severity, missing, warnings, headers });
        });

        req.on('error', (e) => {
          resolve({ url: urlStr, status: 'fail', severity: 'medium', message: `Request error: ${e.message}` });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ url: urlStr, status: 'fail', severity: 'medium', message: 'Request timeout' });
        });

        req.end();
      } catch (err) {
        resolve({ url: urlStr, status: 'fail', severity: 'medium', message: `Invalid URL: ${err.message}` });
      }
    });

    try {
      for (const ep of endpoints) {
        // ensure url has protocol
        const url = ep.match(/^https?:\/\//) ? ep : `http://${ep}`;
        // eslint-disable-next-line no-await-in-loop - keep sequential to avoid bursts
        const r = await checkSingle(url);
        results.push(r);
      }

      // Aggregate results
      const anyFail = results.some(r => r.status === 'fail');
      const anyWarning = results.some(r => r.status === 'warning');

      if (anyFail) {
        return {
          status: 'fail',
          message: 'One or more endpoints missing security headers',
          severity: 'high',
          details: { results }
        };
      }

      if (anyWarning) {
        return {
          status: 'warning',
          message: 'Some endpoints returned header values that should be reviewed',
          severity: 'medium',
          details: { results }
        };
      }

      return {
        status: 'pass',
        message: 'All checked endpoints include required security headers',
        severity: 'low',
        details: { results }
      };
    } catch (error) {
      return {
        status: 'fail',
        message: 'Unable to verify security headers configuration',
        severity: 'medium',
        details: { error: error.message }
      };
    }
  }

/**
 * Check dependency vulnerabilities
 */
  async dependencyVulnerabilities() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Run npm audit
      const { stdout } = await execAsync('npm audit --json', { 
        cwd: process.cwd(),
        timeout: 30000 
      });
      
      const auditResult = JSON.parse(stdout);
      const vulnerabilities = auditResult.metadata?.vulnerabilities || {};
      
      const criticalCount = vulnerabilities.critical || 0;
      const highCount = vulnerabilities.high || 0;
      const moderateCount = vulnerabilities.moderate || 0;

      if (criticalCount > 0) {
        return {
          status: 'fail',
          message: `${criticalCount} critical vulnerabilities found`,
          severity: 'critical',
          details: vulnerabilities,
          recommendations: ['Run npm audit fix', 'Update vulnerable dependencies']
        };
      } else if (highCount > 0) {
        return {
          status: 'warning',
          message: `${highCount} high severity vulnerabilities found`,
          severity: 'high',
          details: vulnerabilities,
          recommendations: ['Run npm audit fix', 'Review and update dependencies']
        };
      } else if (moderateCount > 0) {
        return {
          status: 'warning',
          message: `${moderateCount} moderate vulnerabilities found`,
          severity: 'medium',
          details: vulnerabilities,
          recommendations: ['Consider updating affected packages']
        };
      } else {
        return {
          status: 'pass',
          message: 'No known vulnerabilities found',
          severity: 'low',
          details: vulnerabilities
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Unable to run dependency vulnerability check',
        severity: 'medium',
        details: { error: error.message }
      };
    }
  }

  /**
   * Check authentication security configuration
   */
  async authenticationSecurity() {
    const issues = [];
    const recommendations = [];

    try {
      // Check JWT configuration
      if (!process.env.JWT_SECRET) {
        issues.push('JWT_SECRET not configured');
        recommendations.push('Set a strong JWT_SECRET in environment variables');
      } else if (process.env.JWT_SECRET.length < 32) {
        issues.push('JWT_SECRET is too short');
        recommendations.push('Use a JWT_SECRET with at least 32 characters');
      }

      // Check bcrypt configuration
      const authController = await fs.readFile(
        path.join(process.cwd(), 'controller/authController.js'), 
        'utf8'
      );
      
      if (!authController.includes('bcrypt')) {
        issues.push('Password hashing not detected');
        recommendations.push('Implement bcrypt for password hashing');
      }

      // Check rate limiting
      const hasRateLimit = authController.includes('rateLimit') || 
                          await this.checkFileExists('middleware/rateLimiter.js');
      
      if (!hasRateLimit) {
        issues.push('Rate limiting not configured for authentication');
        recommendations.push('Implement rate limiting for login endpoints');
      }

      if (issues.length === 0) {
        return {
          status: 'pass',
          message: 'Authentication security properly configured',
          severity: 'low'
        };
      } else {
        return {
          status: issues.some(i => i.includes('JWT_SECRET')) ? 'fail' : 'warning',
          message: `Authentication security issues: ${issues.join(', ')}`,
          severity: issues.some(i => i.includes('JWT_SECRET')) ? 'critical' : 'medium',
          details: { issues },
          recommendations
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Unable to verify authentication security',
        severity: 'medium'
      };
    }
  }

  /**
   * Check database security configuration
   */
  async databaseSecurity() {
    const issues = [];
    const recommendations = [];

    // Check database configuration in environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      issues.push('Database connection not properly configured');
      recommendations.push('Configure Supabase connection variables');
    }

    // Check for sensitive information usage
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && 
        process.env.NODE_ENV === 'production') {
      issues.push('Service role key detected in production');
      recommendations.push('Avoid using service role key in client-side code');
    }

    // Check RLS policies
    try {
      const dbFiles = await fs.readdir(path.join(process.cwd(), 'database'));
      const hasPolicies = dbFiles.some(file => file.includes('policy') || file.includes('rls'));
      
      if (!hasPolicies) {
        issues.push('Row Level Security policies not detected');
        recommendations.push('Implement RLS policies for data protection');
      }
    } catch (error) {
      // Database folder might not exist
    }

    if (issues.length === 0) {
      return {
        status: 'pass',
        message: 'Database security properly configured',
        severity: 'low'
      };
    } else {
      return {
        status: 'warning',
        message: `Database security issues: ${issues.join(', ')}`,
        severity: 'medium',
        details: { issues },
        recommendations
      };
    }
  }

  /**
   * Check API security configuration
   */
  async apiSecurity() {
    const issues = [];
    const recommendations = [];

    try {
      const serverFile = await fs.readFile(path.join(process.cwd(), 'server.js'), 'utf8');
      
      // Check CORS configuration
      if (!serverFile.includes('cors')) {
        issues.push('CORS not configured');
        recommendations.push('Configure CORS for API security');
      }

      // Check request size limits
      if (!serverFile.includes('limit')) {
        issues.push('Request size limits not configured');
        recommendations.push('Set request size limits to prevent DoS attacks');
      }

      // Check input validation
      const hasValidation = await this.checkFileExists('middleware/validateRequest.js');
      if (!hasValidation) {
        issues.push('Input validation middleware not detected');
        recommendations.push('Implement input validation for all endpoints');
      }

      if (issues.length === 0) {
        return {
          status: 'pass',
          message: 'API security properly configured',
          severity: 'low'
        };
      } else {
        return {
          status: 'warning',
          message: `API security issues: ${issues.join(', ')}`,
          severity: 'medium',
          details: { issues },
          recommendations
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Unable to verify API security configuration',
        severity: 'medium'
      };
    }
  }

  /**
   * Check environment security configuration
   */
  async environmentSecurity() {
    const issues = [];
    const recommendations = [];

    // Check production environment configuration
    if (process.env.NODE_ENV === 'production') {
      if (process.env.DEBUG) {
        issues.push('Debug mode enabled in production');
        recommendations.push('Disable debug mode in production');
      }
    }

    // Check .env file security
    try {
      const envContent = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');
      
      if (envContent.includes('password=password') || 
          envContent.includes('secret=secret')) {
        issues.push('Default credentials detected in .env file');
        recommendations.push('Change default credentials');
      }
    } catch (error) {
      // .env file might not exist
    }

    // Check .gitignore
    try {
      const gitignore = await fs.readFile(path.join(process.cwd(), '.gitignore'), 'utf8');
      
      if (!gitignore.includes('.env')) {
        issues.push('.env file not in .gitignore');
        recommendations.push('Add .env file to .gitignore');
      }
    } catch (error) {
      issues.push('.gitignore file not found');
      recommendations.push('Create .gitignore file to exclude sensitive files');
    }

    if (issues.length === 0) {
      return {
        status: 'pass',
        message: 'Environment security properly configured',
        severity: 'low'
      };
    } else {
      return {
        status: issues.some(i => i.includes('Default credentials')) ? 'fail' : 'warning',
        message: `Environment security issues: ${issues.join(', ')}`,
        severity: issues.some(i => i.includes('Default credentials')) ? 'high' : 'medium',
        details: { issues },
        recommendations
      };
    }
  }

/**
 * Check access control configuration
 */
  async accessControlChecks() {
    const issues = [];
    const recommendations = [];

    try {
    // Check authentication middleware
      const hasAuthMiddleware = await this.checkFileExists('middleware/authenticateToken.js');
      if (!hasAuthMiddleware) {
        issues.push('Authentication middleware not found');
        recommendations.push('Implement authentication middleware');
      }

    // Check role-based access control
      const authController = await fs.readFile(
        path.join(process.cwd(), 'controller/authController.js'), 
        'utf8'
      );
      
      if (!authController.includes('role') && !authController.includes('permission')) {
        issues.push('Role-based access control not implemented');
        recommendations.push('Implement RBAC for fine-grained access control');
      }

    // Check route protection
      const routeFiles = await fs.readdir(path.join(process.cwd(), 'routes'));
      let protectedRoutes = 0;
      let totalRoutes = 0;

      for (const file of routeFiles) {
        if (file.endsWith('.js')) {
          const routeContent = await fs.readFile(
            path.join(process.cwd(), 'routes', file), 
            'utf8'
          );
          const routeMatches = routeContent.match(/router\.(get|post|put|delete)/g) || [];
          totalRoutes += routeMatches.length;
          
          const protectedMatches = routeContent.match(/authenticateToken/g) || [];
          protectedRoutes += protectedMatches.length;
        }
      }

      const protectionRate = totalRoutes > 0 ? (protectedRoutes / totalRoutes) * 100 : 0;
      
      if (protectionRate < 50) {
        issues.push(`Only ${protectionRate.toFixed(1)}% of routes are protected`);
        recommendations.push('Protect more API routes with authentication');
      }

      if (issues.length === 0) {
        return {
          status: 'pass',
          message: 'Access control properly configured',
          severity: 'low',
          details: { protection_rate: protectionRate }
        };
      } else {
        return {
          status: 'warning',
          message: `Access control issues: ${issues.join(', ')}`,
          severity: 'medium',
          details: { issues, protection_rate: protectionRate },
          recommendations
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Unable to verify access control configuration',
        severity: 'medium'
      };
    }
  }

/**
 * Helper method: Check if a file exists
 */
  async checkFileExists(filePath) {
    try {
      await fs.access(path.join(process.cwd(), filePath));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = SecurityChecklist;