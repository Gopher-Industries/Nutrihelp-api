// routes/security.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/authenticateToken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * 获取最新的安全评估报告
 */
router.get('/assessment/latest', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('security_assessments')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch latest assessment' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取安全评估历史记录
 */
router.get('/assessment/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const { data, error } = await supabase
      .from('security_assessments')
      .select('id, timestamp, overall_score, risk_level, critical_issues, passed_checks, total_checks')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch assessment history' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取安全趋势数据
 */
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('security_assessments')
      .select('timestamp, overall_score, critical_issues, risk_level')
      .gte('timestamp', dateFrom.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch trend data' });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 获取错误日志统计
 */
router.get('/error-logs/stats', authenticateToken, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const dateFrom = new Date(Date.now() - hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('error_logs')
      .select('error_category, error_type, timestamp')
      .gte('timestamp', dateFrom.toISOString());

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch error log stats' });
    }

    // 统计数据
    const stats = {
      total_errors: data.length,
      by_category: {},
      by_type: {},
      hourly_distribution: {}
    };

    data.forEach(log => {
      // 按分类统计
      stats.by_category[log.error_category] = (stats.by_category[log.error_category] || 0) + 1;
      
      // 按类型统计
      stats.by_type[log.error_type] = (stats.by_type[log.error_type] || 0) + 1;
      
      // 按小时统计
      const hour = new Date(log.timestamp).getHours();
      stats.hourly_distribution[hour] = (stats.hourly_distribution[hour] || 0) + 1;
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 手动触发安全评估
 */
router.post('/assessment/run', authenticateToken, async (req, res) => {
  try {
    // 这里应该触发安全评估
    // 可以通过队列系统或直接运行
    const SecurityAssessmentRunner = require('../security/runAssessment');
    const runner = new SecurityAssessmentRunner();
    
    // 异步运行评估，立即返回响应
    runner.run().catch(console.error);
    
    res.json({ 
      success: true, 
      message: 'Security assessment started',
      note: 'Results will be available in a few minutes'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start security assessment' });
  }
});

module.exports = router;