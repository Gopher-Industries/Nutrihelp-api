require('dotenv').config();
// security/runAssessment.js
const SecurityChecklist = require('./securityChecklist');
const SecurityReportGenerator = require('./reportGenerator');
const { createClient } = require('@supabase/supabase-js');

class SecurityAssessmentRunner {
  constructor() {
    this.checklist = new SecurityChecklist();
    this.reportGenerator = new SecurityReportGenerator();

    // Make Supabase optional for local testing. If env vars are missing,
    // don't create the client and skip DB storage.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      this.hasSupabase = true;
    } else {
      console.warn(
        '⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set. Database storage will be skipped.'
      );
      this.supabase = null;
      this.hasSupabase = false;
    }
  }

  /**
   * Run a complete security assessment process
   */
  async run() {
    try {
      console.log('🚀 Starting NutriHelp Security Assessment...');
      console.log('='.repeat(50));

      // 1. Run security checks
      const assessmentResults = await this.checklist.runSecurityAssessment();

      // 2. Generate Report
      console.log('\n📊 Generating security reports...');
      const reportData = await this.reportGenerator.generateReport(assessmentResults);

      // 3. Store in database
      await this.storeAssessmentResults(reportData);

      // 4. Send notifications (if critical issues found)
      if (reportData.critical_issues > 0) {
        // Slack notifications are disabled for this forked repo (no SLACK_WEBHOOK configured).
        // If you want to enable notifications, restore `sendCriticalAlert`/`sendSlackAlert`
        // or set the SLACK_WEBHOOK environment variable in your GitHub repository secrets.
        console.log(
          'Notifications disabled: critical issues detected but Slack alerts are turned off.'
        );
      }

      // 5. Output Summary
      this.printSummary(reportData);

      console.log('\n✅ Security assessment completed successfully!');

      // Setting up GitHub Actions output
      if (process.env.GITHUB_ACTIONS) {
        const fs = require('fs');
        const output =
          reportData.critical_issues > 0
            ? 'critical'
            : reportData.overall_score < 70
              ? 'warning'
              : 'pass';
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `result=${output}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `score=${reportData.overall_score}\n`);
      }

      return reportData;
    } catch (error) {
      console.error('❌ Security assessment failed:', error);
      process.exit(1);
    }
  }

  /**
   * Store evaluation results in the database
   */
  async storeAssessmentResults(reportData) {
    if (!this.hasSupabase || !this.supabase) {
      console.log('ℹ️  Skipping database storage (Supabase not configured)');
      return;
    }

    try {
      const { error } = await this.supabase.from('security_assessments').insert([
        {
          timestamp: reportData.timestamp,
          overall_score: reportData.overall_score,
          total_checks: reportData.total_checks,
          passed_checks: reportData.passed_checks,
          failed_checks: reportData.failed_checks,
          warnings: reportData.warnings,
          critical_issues: reportData.critical_issues,
          risk_level: reportData.risk_level,
          detailed_results: reportData.checks,
          recommendations: reportData.recommendations,
          compliance_status: reportData.compliance_status,
        },
      ]);

      if (error) {
        console.error('Failed to store assessment results:', error);
      } else {
        console.log('✅ Assessment results stored to database');
      }
    } catch (error) {
      console.error('Database storage error:', error);
    }
  }

  /**
   * Send critical alert
   */
  async sendCriticalAlert(reportData) {
    console.log('🚨 CRITICAL SECURITY ISSUES DETECTED!');
    console.log(`Critical issues: ${reportData.critical_issues}`);
    console.log(`Overall score: ${reportData.overall_score}%`);

    // The actual alarm system can be integrated here
    // For example: Slack, Email, PagerDuty, etc.

    // Example: Send to Slack (requires Webhook configuration)
    if (process.env.SLACK_WEBHOOK) {
      await this.sendSlackAlert(reportData);
    }
  }

  /**
   * Send Slack alert
   */
  async sendSlackAlert(reportData) {
    // Slack alerting intentionally disabled in this fork.
    // To re-enable: implement sending logic here and ensure SLACK_WEBHOOK is set in secrets.
    console.log('sendSlackAlert: disabled (no SLACK_WEBHOOK configured)');
  }

  /**
   * Print assessment summary
   */
  printSummary(reportData) {
    console.log('\n' + '='.repeat(50));
    console.log('📋 SECURITY ASSESSMENT SUMMARY');
    console.log('='.repeat(50));
    console.log(`🎯 Overall Score: ${reportData.overall_score}%`);
    console.log(`🎚️  Risk Level: ${reportData.risk_level.toUpperCase()}`);
    console.log(`✅ Passed Checks: ${reportData.passed_checks}/${reportData.total_checks}`);
    console.log(`❌ Failed Checks: ${reportData.failed_checks}`);
    console.log(`⚠️  Warnings: ${reportData.warnings}`);
    console.log(`🚨 Critical Issues: ${reportData.critical_issues}`);

    if (reportData.recommendations.length > 0) {
      console.log('\n📋 Priority Recommendations:');
      reportData.recommendations.forEach((rec) => {
        console.log(`   ${rec.priority}: ${rec.description}`);
      });
    }

    console.log('\n📁 Reports generated in: security/reports/');
  }
}

// If this script is run directly
if (require.main === module) {
  const runner = new SecurityAssessmentRunner();
  runner.run().catch(console.error);
}

module.exports = SecurityAssessmentRunner;
