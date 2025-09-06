// routes/scanner.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Storage Scan Status
const activeScanners = new Map();

/**
 * @swagger
 * /api/scanner/test:
 *   get:
 *     summary: Test endpoint
 *     tags: [Vulnerability Scanner]
 *     responses:
 *       200:
 *         description: Test successful
 */
router.get('/test', (req, res) => {
    res.json({ message: 'Scanner API is working!', timestamp: new Date().toISOString() });
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ScanRequest:
 *       type: object
 *       required:
 *         - target_path
 *       properties:
 *         target_path:
 *           type: string
 *           description: Target path to scan
 *           example: "./routes"
 *         plugins:
 *           type: array
 *           items:
 *             type: string
 *           description: Specify the plugin to use
 *           example: ["JWTMissingProtectionPlugin", "JWTConfigurationPlugin"]
 *         output_format:
 *           type: string
 *           enum: [json, html]
 *           default: json
 *           description: Output format
 *     ScanResult:
 *       type: object
 *       properties:
 *         scan_id:
 *           type: string
 *           description: Scan ID
 *         target_path:
 *           type: string
 *           description: Scan target path
 *         scan_time:
 *           type: string
 *           format: date-time
 *           description: Scan time
 *         total_files:
 *           type: integer
 *           description: Total number of files scanned
 *         total_findings:
 *           type: integer
 *           description: Total number of findings
 *         severity_summary:
 *           type: object
 *           properties:
 *             CRITICAL:
 *               type: integer
 *             HIGH:
 *               type: integer
 *             MEDIUM:
 *               type: integer
 *             LOW:
 *               type: integer
 *         findings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               severity:
 *                 type: string
 *               file_path:
 *                 type: string
 *               description:
 *                 type: string
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/scanner/health:
 *   get:
 *     summary: Scanner health check
 *     tags: [Vulnerability Scanner]
 *     responses:
 *       200:
 *         description: Scanner is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 version:
 *                   type: string
 *                   example: "2.0.0"
 */
router.get('/health', async (req, res) => {
    try {
        const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
        const exists = await fs.access(scannerPath).then(() => true).catch(() => false);
        
        res.json({
            status: exists ? 'healthy' : 'scanner_not_found',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            scanner_path: scannerPath
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/scanner/plugins:
 *   get:
 *     summary: Get available plugin list
 *     tags: [Vulnerability Scanner]
 *     responses:
 *       200:
 *         description: Plugin list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plugins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 */
router.get('/plugins', async (req, res) => {
    try {
        const plugins = [
            {
                name: "JWTMissingProtectionPlugin",
                description: "Detect missing JWT protection in API endpoints",
                severity_level: "HIGH"
            },
            {
                name: "JWTConfigurationPlugin", 
                description: "Validate JWT configuration security",
                severity_level: "MEDIUM"
            }
        ];
        
        res.json({ plugins });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/scanner/scan:
 *   post:
 *     summary: Start security scan
 *     tags: [Vulnerability Scanner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScanRequest'
 *     responses:
 *       200:
 *         description: Scan started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scan_id:
 *                   type: string
 *                 message:
 *                   type: string
 *                 status_url:
 *                   type: string
 *       400:
 *         description: Request parameter error
 *       500:
 *         description: Server error
 */
router.post('/scan', async (req, res) => {
    try {
        const { target_path, plugins, output_format = 'json' } = req.body;
        
        if (!target_path) {
            return res.status(400).json({
                success: false,
                error: 'target_path is required'
            });
        }
        
        // Validate target path
        const targetExists = await fs.access(target_path).then(() => true).catch(() => false);
        if (!targetExists) {
            return res.status(400).json({
                success: false,
                error: `Target path does not exist: ${target_path}`
            });
        }
        
        const scanId = uuidv4();

        // Start asynchronous scan
        startPythonScan(scanId, target_path, plugins, output_format);
        
        res.json({
            scan_id: scanId,
            message: 'Scan started successfully',
            status_url: `/api/scanner/scan/${scanId}/status`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/scanner/scan/{scanId}/status:
 *   get:
 *     summary: Get scan status
 *     tags: [Vulnerability Scanner]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *         description: 扫描ID
 *     responses:
 *       200:
 *         description: 扫描状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scan_id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [running, completed, failed]
 *                 progress:
 *                   type: integer
 *                 message:
 *                   type: string
 *       404:
 *         description: Scan ID does not exist
 */
router.get('/scan/:scanId/status', (req, res) => {
    const { scanId } = req.params;
    const scanInfo = activeScanners.get(scanId);
    
    if (!scanInfo) {
        return res.status(404).json({
            success: false,
            error: 'Scan ID not found'
        });
    }
    
    res.json({
        scan_id: scanId,
        status: scanInfo.status,
        progress: scanInfo.progress,
        message: scanInfo.message
    });
});

/**
 * @swagger
 * /api/scanner/scan/{scanId}/result:
 *   get:
 *     summary: Get scan result
 *     tags: [Vulnerability Scanner]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan ID
 *     responses:
 *       200:
 *         description: Scan result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 *       202:
 *         description: Scan not completed yet
 *       404:
 *         description: Scan ID does not exist
 */
router.get('/scan/:scanId/result', (req, res) => {
    const { scanId } = req.params;
    const scanInfo = activeScanners.get(scanId);
    
    if (!scanInfo) {
        return res.status(404).json({
            success: false,
            error: 'Scan ID not found'
        });
    }
    
    if (scanInfo.status !== 'completed') {
        return res.status(202).json({
            success: false,
            error: 'Scan not completed yet',
            status: scanInfo.status
        });
    }
    
    if (!scanInfo.result) {
        return res.status(500).json({
            success: false,
            error: 'Scan result not available'
        });
    }
    
    res.json(scanInfo.result);
});

/**
 * @swagger
 * /api/scanner/scan/{scanId}/report:
 *   get:
 *     summary: Download scan report
 *     tags: [Vulnerability Scanner]
 *     parameters:
 *       - in: path
 *         name: scanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Scan ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [html, json]
 *           default: html
 *         description: Report format
 *     responses:
 *       200:
 *         description: Report file
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Scan ID does not exist
 */
router.get('/scan/:scanId/report', (req, res) => {
    const { scanId } = req.params;
    const { format = 'html' } = req.query;
    const scanInfo = activeScanners.get(scanId);
    
    if (!scanInfo) {
        return res.status(404).json({
            success: false,
            error: 'Scan ID not found'
        });
    }
    
    if (scanInfo.status !== 'completed') {
        return res.status(202).json({
            success: false,
            error: 'Scan not completed yet'
        });
    }
    
    if (format === 'html' && scanInfo.htmlReport) {
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="security_report_${scanId}.html"`);
        res.send(scanInfo.htmlReport);
    } else if (format === 'json') {
        res.setHeader('Content-Disposition', `attachment; filename="security_report_${scanId}.json"`);
        res.json(scanInfo.result);
    } else {
        res.status(400).json({
            success: false,
            error: 'Invalid format or report not available'
        });
    }
});

/**
 * @swagger
 * /api/scanner/quick-scan:
 *   post:
 *     summary: Quick synchronous scan
 *     tags: [Vulnerability Scanner]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScanRequest'
 *     responses:
 *       200:
 *         description: Scan result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResult'
 */
router.post('/quick-scan', async (req, res) => {
    try {
        const { target_path, plugins, output_format = 'json' } = req.body;
        
        if (!target_path) {
            return res.status(400).json({
                success: false,
                error: 'target_path is required'
            });
        }
        
        const scanId = uuidv4();
        const result = await runPythonScanSync(target_path, plugins, output_format);
        
        res.json({
            scan_id: scanId,
            target_path: target_path,
            scan_time: new Date().toISOString(),
            ...result
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start asynchronous Python scan
function startPythonScan(scanId, targetPath, plugins, outputFormat) {
    activeScanners.set(scanId, {
        status: 'running',
        progress: 0,
        message: 'Scan initiated'
    });
    
    const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
    const pythonPath = path.join(scannerPath, 'venv/bin/python');
    const scriptPath = path.join(scannerPath, 'scanner_v2.py');
    
    const args = ['--target', targetPath, '--format', outputFormat];
    
    const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
        cwd: scannerPath
    });
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        // Update progress
        const scanInfo = activeScanners.get(scanId);
        console.log('Python output chunk:', data.toString()); // Debug output
    });
    
    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
        console.log('Full Python output:', outputData);

        const scanInfo = activeScanners.get(scanId);
        if (!scanInfo) return;
        
        if (code === 0) {
            try {
                const jsonStart = outputData.lastIndexOf('{');
                const jsonEnd = outputData.lastIndexOf('}') + 1;
                const jsonPart = outputData.substring(jsonStart, jsonEnd);

                const result = JSON.parse(jsonPart);
                scanInfo.status = 'completed';
                scanInfo.progress = 100;
                scanInfo.message = 'Scan completed successfully';
                scanInfo.result = result;

                // If there is HTML output, save it as well
                if (outputFormat === 'html') {
                    scanInfo.htmlReport = generateHTMLReport(result);
                }
            } catch (error) {
                scanInfo.status = 'failed';
                scanInfo.message = `Failed to parse scan result: ${error.message}`;
            }
        } else {
            scanInfo.status = 'failed';
            scanInfo.message = `Scan failed with code ${code}: ${errorData}`;
        }
    });
}

// Run Python scan synchronously
function runPythonScanSync(targetPath, plugins, outputFormat) {
    return new Promise((resolve, reject) => {
        const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
        const pythonPath = path.join(scannerPath, 'venv/bin/python');
        const scriptPath = path.join(scannerPath, 'scanner_v2.py');
        
        const args = ['--target', targetPath, '--format', 'json'];
        
        const pythonProcess = spawn(pythonPath, [scriptPath, ...args], {
            cwd: scannerPath
        });
        
        let outputData = '';
        let errorData = '';
        
        pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(outputData);
                    resolve(result);
                } catch (error) {
                    reject(new Error(`Failed to parse scan result: ${error.message}`));
                }
            } else {
                reject(new Error(`Scan failed with code ${code}: ${errorData}`));
            }
        });
    });
}

// Generate HTML report
function generateHTMLReport(scanResult) {
    const { summary, findings } = scanResult;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>NutriHelp Security Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
        .finding { border: 1px solid #e2e8f0; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .critical { border-left: 4px solid #dc2626; }
        .high { border-left: 4px solid #ea580c; }
        .medium { border-left: 4px solid #d97706; }
        .low { border-left: 4px solid #65a30d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 NutriHelp Vulnerability Scanner V2.0</h1>
        <p>Scan Time: ${new Date().toISOString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>${summary.files_scanned}</h3>
            <p>Files Scanned</p>
        </div>
        <div class="metric">
            <h3>${findings.length}</h3>
            <p>Total Issues</p>
        </div>
        <div class="metric">
            <h3>${summary.by_severity.CRITICAL || 0}</h3>
            <p>Critical</p>
        </div>
        <div class="metric">
            <h3>${summary.by_severity.HIGH || 0}</h3>
            <p>High</p>
        </div>
    </div>
    
    <h2>📋 Detailed Findings</h2>
    ${findings.map(finding => `
        <div class="finding ${finding.severity.toLowerCase()}">
            <h3>${finding.title} <span style="color: #666;">(${finding.severity})</span></h3>
            <p><strong>File:</strong> ${finding.file_path}</p>
            <p><strong>Description:</strong> ${finding.description}</p>
            <p><small>Plugin: ${finding.plugin_name}</small></p>
        </div>
    `).join('')}
</body>
</html>`;
}

module.exports = router;