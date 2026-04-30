const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/authenticateToken');
const authorizeRoles = require('../middleware/authorizeRoles');
const logger = require('../utils/logger');

const { getSupabaseServiceClient } = require('../services/supabaseClient');
const supabaseService = getSupabaseServiceClient();

const VALID_SEVERITIES = new Set(['Critical', 'High', 'Medium', 'Low']);
const VALID_TIME_RANGES = new Set(['1h', '6h', '24h', '7d']);
const TIME_RANGE_MS = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;
const SUMMARY_DEFAULT_RANGE = '7d';

const alertsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests on alert endpoints.' }
});

router.use(authenticateToken);
router.use(authorizeRoles('admin'));
router.use(alertsRateLimiter);

// GET /api/security/alerts
router.get('/', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({
        success: false,
        error: 'Alert service is not configured. Check Supabase environment variables.'
      });
    }

    const rawLimit = parseInt(req.query.limit, 10);
    const rawOffset = parseInt(req.query.offset, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const { severity, timeRange, acknowledged } = req.query;

    if (severity && severity !== 'All' && !VALID_SEVERITIES.has(severity)) {
      return res.status(400).json({ success: false, error: `Invalid severity. Must be one of: All, ${[...VALID_SEVERITIES].join(', ')}` });
    }

    if (timeRange && !VALID_TIME_RANGES.has(timeRange)) {
      return res.status(400).json({ success: false, error: `Invalid timeRange. Must be one of: ${[...VALID_TIME_RANGES].join(', ')}` });
    }

    let query = supabaseService
      .from('alert_history')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (severity && severity !== 'All') {
      query = query.eq('severity', severity);
    }

    const windowMs = TIME_RANGE_MS[timeRange] || TIME_RANGE_MS['24h'];
    query = query.gte('created_at', new Date(Date.now() - windowMs).toISOString());

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[GET /api/security/alerts] Supabase query error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      }
    });
  } catch (error) {
    logger.error('[GET /api/security/alerts] Exception:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/security/alerts/summary
// Uses DB-side counting per severity to avoid loading the full dataset into memory.
router.get('/summary', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({ success: false, error: 'Alert service is not configured' });
    }

    const timeRange = req.query.timeRange || SUMMARY_DEFAULT_RANGE;
    if (!VALID_TIME_RANGES.has(timeRange)) {
      return res.status(400).json({ success: false, error: `Invalid timeRange. Must be one of: ${[...VALID_TIME_RANGES].join(', ')}` });
    }

    const since = new Date(Date.now() - TIME_RANGE_MS[timeRange]).toISOString();

    const severities = ['Critical', 'High', 'Medium', 'Low'];
    const [totalResult, unackResult, ...severityResults] = await Promise.all([
      supabaseService.from('alert_history').select('id', { count: 'exact', head: true }).gte('created_at', since),
      supabaseService.from('alert_history').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('acknowledged', false),
      ...severities.map((s) =>
        supabaseService.from('alert_history').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('severity', s)
      )
    ]);

    if (totalResult.error) {
      logger.error('[GET /api/security/alerts/summary] Query error:', totalResult.error);
      return res.status(500).json({ success: false, error: 'Failed to fetch alert summary' });
    }

    const summary = {
      total: totalResult.count || 0,
      unacknowledged: unackResult.count || 0,
      critical: severityResults[0].count || 0,
      high: severityResults[1].count || 0,
      medium: severityResults[2].count || 0,
      low: severityResults[3].count || 0,
      time_range: timeRange,
      since
    };

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    logger.error('[GET /api/security/alerts/summary] Exception:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/security/alerts/:id/acknowledge
router.post('/:id/acknowledge', async (req, res) => {
  try {
    if (!supabaseService) {
      return res.status(503).json({ success: false, error: 'Alert service is not configured' });
    }

    const { id } = req.params;
    const rawAcknowledgedBy = req.body.acknowledged_by;

    if (!rawAcknowledgedBy || typeof rawAcknowledgedBy !== 'string') {
      return res.status(400).json({ success: false, error: 'acknowledged_by must be a non-empty string' });
    }

    const acknowledgedBy = rawAcknowledgedBy.trim();
    if (acknowledgedBy.length === 0 || acknowledgedBy.length > 254) {
      return res.status(400).json({ success: false, error: 'acknowledged_by must be between 1 and 254 characters' });
    }

    const { data, error } = await supabaseService
      .from('alert_history')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      logger.error(`[POST /api/security/alerts/${id}/acknowledge] Update error:`, error);
      return res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
    }

    return res.status(200).json({ success: true, message: 'Alert acknowledged', data: data?.[0] });
  } catch (error) {
    logger.error('[POST /api/security/alerts/:id/acknowledge] Exception:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
