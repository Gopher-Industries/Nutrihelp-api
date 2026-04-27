/**
 * routes/alerts.js
 * 
 * CT-004 Week 6: Real-Time Monitoring and Alerting
 * 
 * Provides endpoints for alert management:
 * - GET  /api/security/alerts - Fetch all alerts with filtering
 * - POST /api/security/alerts/:id/acknowledge - Acknowledge an alert
 * - GET  /api/security/alerts/summary - Get alert dashboard summary
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const logger = require('../utils/logger');

let supabaseService = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
} catch (error) {
  logger.warn('[alerts route] Failed to initialize Supabase:', error.message);
}

// Apply authentication and admin authorization to all alert routes
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

/**
 * GET /api/security/alerts
 * 
 * Fetch alerts with optional filtering
 * 
 * Query Parameters:
 * - severity: 'All' | 'Critical' | 'High' | 'Medium' | 'Low'
 * - timeRange: '1h' | '6h' | '24h' | '7d'
 * - acknowledged: true | false
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
router.get('/', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({
        success: false,
        error: 'Alert service is not configured. Check Supabase environment variables.'
      });
    }

    const { severity, timeRange, acknowledged, limit = 50, offset = 0 } = req.query;

    let query = supabaseService
      .from('alert_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply severity filter
    if (severity && severity !== 'All') {
      query = query.eq('severity', severity);
    }

    // Apply time range filter
    if (timeRange) {
      const now = new Date();
      let startTime;

      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      query = query.gte('created_at', startTime.toISOString());
    }

    // Apply acknowledged filter
    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[GET /api/security/alerts] Supabase query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < (count || 0)
      }
    });
  } catch (error) {
    logger.error('[GET /api/security/alerts] Exception:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/security/alerts/summary
 * 
 * Get alert dashboard summary with counts by severity
 */
router.get('/summary', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({
        success: false,
        error: 'Alert service is not configured'
      });
    }

    const { data: allAlerts, error } = await supabaseService
      .from('alert_history')
      .select('severity, acknowledged', { count: 'exact' });

    if (error) {
      logger.error('[GET /api/security/alerts/summary] Query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch alert summary'
      });
    }

    const summary = {
      total: allAlerts?.length || 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unacknowledged: 0
    };

    (allAlerts || []).forEach(alert => {
      switch (alert.severity) {
        case 'Critical':
          summary.critical++;
          break;
        case 'High':
          summary.high++;
          break;
        case 'Medium':
          summary.medium++;
          break;
        case 'Low':
          summary.low++;
          break;
      }

      if (!alert.acknowledged) {
        summary.unacknowledged++;
      }
    });

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('[GET /api/security/alerts/summary] Exception:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/security/alerts/:id/acknowledge
 * 
 * Acknowledge an alert (mark as reviewed)
 * 
 * Body:
 * {
 *   "acknowledged_by": "user@example.com"
 * }
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({
        success: false,
        error: 'Alert service is not configured'
      });
    }

    const { id } = req.params;
    const { acknowledged_by } = req.body;

    if (!acknowledged_by) {
      return res.status(400).json({
        success: false,
        error: 'acknowledged_by is required'
      });
    }

    const { data, error } = await supabaseService
      .from('alert_history')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledged_by,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      logger.error(`[POST /api/security/alerts/${id}/acknowledge] Update error:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert acknowledged',
      data: data?.[0]
    });
  } catch (error) {
    logger.error(`[POST /api/security/alerts/:id/acknowledge] Exception:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
