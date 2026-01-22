const fs = require('fs').promises;
const path = require('path');

class SecurityReportGenerator {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'security/reports');
  }

/**
 * Generate security report
 */
  async generateReport(assessmentResults) {
    await this.ensureReportDirectory();
    
    const reportData = {
      ...assessmentResults,
      generated_by: 'NutriHelp Security Assessment Tool',
      version: '1.0.0',
      report_format: 'v1',
      recommendations: this.generateRecommendations(assessmentResults),
      risk_level: this.calculateRiskLevel(assessmentResults),
      compliance_status: this.checkCompliance(assessmentResults)
    };

    // Generate reports in multiple formats
    await Promise.all([
      this.generateJSONReport(reportData),
      this.generateHTMLReport(reportData),
      this.generateMarkdownReport(reportData),
      this.generateCSVSummary(reportData)
    ]);

    return reportData;
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}.json`;
    const filepath = path.join(this.reportDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));
    console.log(`📄 JSON report generated: ${filename}`);
    return filename;
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}.html`;
    const filepath = path.join(this.reportDir, filename);
    
    const html = this.generateHTMLContent(reportData);
    await fs.writeFile(filepath, html);
    console.log(`📄 HTML report generated: ${filename}`);
    return filename;
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-report-${timestamp}.md`;
    const filepath = path.join(this.reportDir, filename);
    
    const markdown = this.generateMarkdownContent(reportData);
    await fs.writeFile(filepath, markdown);
    console.log(`📄 Markdown report generated: ${filename}`);
    return filename;
  }

  /**
   * Generate CSV summary
   */
  async generateCSVSummary(reportData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `security-summary-${timestamp}.csv`;
    const filepath = path.join(this.reportDir, filename);
    
    const csv = this.generateCSVContent(reportData);
    await fs.writeFile(filepath, csv);
    console.log(`📄 CSV summary generated: ${filename}`);
    return filename;
  }

  /**
   * Generate HTML content
   */
  generateHTMLContent(reportData) {
    const riskColor = this.getRiskColor(reportData.risk_level);
    const scoreColor = reportData.overall_score >= 80 ? '#28a745' : 
                      reportData.overall_score >= 60 ? '#ffc107' : '#dc3545';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriHelp Security Assessment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
  .score-card { display: flex; justify-content: space-around; margin: 20px 0; }
  .score-item { text-align: center; padding: 20px; border-radius: 8px; background: #f8f9fa; }
  .score-value { font-size: 2em; font-weight: bold; color: ${scoreColor}; }
  .score-subtext { font-size: 0.95em; color: #333; margin-top: 8px; }
        .risk-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; background: ${riskColor}; font-weight: bold; }
        .check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .check-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .status-pass { border-left: 4px solid #28a745; background: #f8fff9; }
        .status-fail { border-left: 4px solid #dc3545; background: #fff8f8; }
        .status-warning { border-left: 4px solid #ffc107; background: #fffbf0; }
        .status-skip { border-left: 4px solid #6c757d; background: #f8f9fa; }
        .recommendations { margin-top: 30px; }
        .recommendation-item { margin: 10px 0; padding: 10px; background: #e7f3ff; border-radius: 4px; }
        .timestamp { color: #666; font-size: 0.9em; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 NutriHelp Security Assessment Report</h1>
            <p class="timestamp">Generated: ${new Date(reportData.timestamp).toLocaleString()}</p>
            <p>Overall Risk Level: <span class="risk-badge">${reportData.risk_level.toUpperCase()}</span></p>
        </div>

        <div class="score-card">
      <div class="score-item">
        <div class="score-value">${reportData.overall_score}%</div>
        <div class="score-subtext">Overall Score</div>
      </div>
      <div class="score-item">
        <div class="score-value" style="color: #28a745;">${reportData.passed_checks}/${reportData.total_checks}</div>
        <div class="score-subtext">Passed Checks</div>
      </div>
            <div class="score-item">
                <div class="score-value" style="color: #dc3545;">${reportData.failed_checks}</div>
                <div>Failed Checks</div>
            </div>
            <div class="score-item">
                <div class="score-value" style="color: #ffc107;">${reportData.warnings}</div>
                <div>Warnings</div>
            </div>
            <div class="score-item">
                <div class="score-value" style="color: #dc3545;">${reportData.critical_issues}</div>
                <div>Critical Issues</div>
            </div>
        </div>

        <h2>🔍 Security Check Details</h2>
        <div class="check-grid">
            ${Object.entries(reportData.checks).map(([name, check]) => `
                <div class="check-card status-${check.status}">
                    <h3>${this.formatCheckName(name)}</h3>
                    <p><strong>Status:</strong> ${check.status.toUpperCase()}</p>
                    <p><strong>Message:</strong> ${check.message}</p>
                    ${check.severity ? `<p><strong>Severity:</strong> <span class="severity-${check.severity}">${check.severity.toUpperCase()}</span></p>` : ''}
                    ${check.recommendations ? `
                        <div><strong>Recommendations:</strong>
                            <ul>${check.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        ${reportData.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>📋 Priority Recommendations</h2>
                ${reportData.recommendations.map(rec => `
                    <div class="recommendation-item">
                        <strong>${rec.priority}:</strong> ${rec.description}
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
            <p>Generated by NutriHelp Security Assessment Tool v1.0.0</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown content
   */
  generateMarkdownContent(reportData) {
    return `# 🔒 NutriHelp Security Assessment Report

**Generated:** ${new Date(reportData.timestamp).toLocaleString()}  
**Overall Score:** ${reportData.overall_score}%  
**Risk Level:** ${reportData.risk_level.toUpperCase()}

## 📊 Summary

| Metric | Count |
|--------|-------|
| Total Checks | ${reportData.total_checks} |
| Passed | ${reportData.passed_checks} |
| Failed | ${reportData.failed_checks} |
| Warnings | ${reportData.warnings} |
| Critical Issues | ${reportData.critical_issues} |

## 🔍 Detailed Results

${Object.entries(reportData.checks).map(([name, check]) => `
### ${this.formatCheckName(name)}

- **Status:** ${check.status.toUpperCase()}
- **Message:** ${check.message}
${check.severity ? `- **Severity:** ${check.severity.toUpperCase()}` : ''}
${check.recommendations ? `
- **Recommendations:**
${check.recommendations.map(rec => `  - ${rec}`).join('\n')}` : ''}

`).join('')}

${reportData.recommendations.length > 0 ? `
## 📋 Priority Recommendations

${reportData.recommendations.map(rec => `
### ${rec.priority}
${rec.description}
`).join('')}
` : ''}

---
*Generated by NutriHelp Security Assessment Tool v1.0.0*`;
  }

  /**
   * Generate CSV content
   */
  generateCSVContent(reportData) {
    const headers = 'Check Name,Status,Severity,Message,Recommendations\n';
    const rows = Object.entries(reportData.checks).map(([name, check]) => {
      const recommendations = check.recommendations ? check.recommendations.join('; ') : '';
      return `"${this.formatCheckName(name)}","${check.status}","${check.severity || ''}","${check.message}","${recommendations}"`;
    }).join('\n');
    
    return headers + rows;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(assessmentResults) {
    const recommendations = [];

    // Generate priority recommendations based on critical issues
    if (assessmentResults.critical_issues > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        description: 'Address all critical security issues immediately. These pose significant risk to the application.'
      });
    }
    
    if (assessmentResults.overall_score < 60) {
      recommendations.push({
        priority: 'HIGH',
        description: 'Overall security score is below acceptable threshold. Implement a comprehensive security improvement plan.'
      });
    }
    
    if (assessmentResults.failed_checks > 2) {
      recommendations.push({
        priority: 'MEDIUM',
        description: 'Multiple security checks failed. Review and address each failed check systematically.'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(assessmentResults) {
    if (assessmentResults.critical_issues > 0) return 'critical';
    if (assessmentResults.overall_score < 60) return 'high';
    if (assessmentResults.failed_checks > 2) return 'medium';
    return 'low';
  }

  /**
   * Check compliance status
   */
  checkCompliance(assessmentResults) {
    const compliance = {
      owasp_top_10: assessmentResults.overall_score >= 80,
      internal_standards: assessmentResults.critical_issues === 0,
      production_ready: assessmentResults.overall_score >= 90 && assessmentResults.critical_issues === 0
    };
    
    return compliance;
  }

  /**
   * Get risk color
   */
  getRiskColor(riskLevel) {
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[riskLevel] || '#6c757d';
  }

  /**
   * Format check name
   */
  formatCheckName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDirectory() {
    try {
      await fs.mkdir(this.reportDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create report directory:', error);
    }
  }
}

module.exports = SecurityReportGenerator;