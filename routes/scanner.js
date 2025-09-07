// routes/scanner.js
const express = require('express');
const router = express.Router();
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Storage Scan Status
const activeScanners = new Map();

// Generate scan id in style: scan_YYYYMMDD_HHMMSS_<rnd>
function generateScanId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const DD = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `scan_${YYYY}${MM}${DD}_${hh}${mm}${ss}`;
}

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
        
    const scanId = generateScanId();

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
router.get('/scan/:scanId/status', async (req, res) => {
    const { scanId } = req.params;
    let scanInfo = activeScanners.get(scanId);
    
    if (!scanInfo) {
        // Try to load persisted report files as a fallback (project reports or scanner reports)
        const projectReportJson = path.join(process.cwd(), 'reports', `security_result_${scanId}.json`);
        const scannerReportHtml = path.join(process.cwd(), 'Vulnerability_Tool_V2', 'reports', `security_report_${scanId}.html`);
        try {
            // try json first
            if (fs) {
                const jsonExists = await fs.access(projectReportJson).then(() => true).catch(() => false);
                if (jsonExists) {
                    const data = await fs.readFile(projectReportJson, 'utf8');
                    scanInfo = { status: 'completed', result: JSON.parse(data) };
                } else {
                    const htmlExists = await fs.access(scannerReportHtml).then(() => true).catch(() => false);
                    if (htmlExists) {
                        const html = await fs.readFile(scannerReportHtml, 'utf8');
                        // crude extraction: count finding blocks and try to read embedded summary JSON
                        const findings = [];
                        const findingRegex = /<div class="finding-title">([\s\S]*?)<\/div>/g;
                        let m;
                        while ((m = findingRegex.exec(html)) !== null) {
                            findings.push({ title: m[1].trim() });
                        }
                        // try to extract a summary JSON blob if present
                        const jsonBlobMatch = html.match(/\{[\s\S]*?\}/);
                        let summary = {};
                        if (jsonBlobMatch) {
                            try { summary = JSON.parse(jsonBlobMatch[0]); } catch (e) { summary = {}; }
                        }
                        scanInfo = { status: 'completed', result: { scan_info: summary.scan_info || {}, summary: summary.summary || {}, findings: findings } };
                    }
                }
            }
        } catch (e) {
            // ignore and fall through to 404
        }
    }
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
router.get('/scan/:scanId/result', async (req, res) => {
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
    
    // Normalize response: ensure scan_id matches requested scanId and return summary before findings
    const fullResult = scanInfo.result || {};
    const summary = fullResult.summary || fullResult.scan_info || {};
    const findings = fullResult.findings || fullResult.issues || [];

    const responsePayload = {
        scan_id: scanId,
        summary: {
            total_findings: summary.total || summary.total_findings || (Array.isArray(findings) ? findings.length : 0),
            files_scanned: summary.files_scanned || (summary.stats && summary.stats.files_scanned) || (fullResult.scan_info && fullResult.scan_info.stats && fullResult.scan_info.stats.files_scanned) || null,
            by_severity: summary.by_severity || summary.severity_summary || fullResult.by_severity || null,
            by_plugin: summary.by_plugin || fullResult.by_plugin || null
        },
        findings: findings
    };

    res.json(responsePayload);
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
router.get('/scan/:scanId/report', async (req, res) => {
    const { scanId } = req.params;
    const { format = 'html' } = req.query;
    console.log('REPORT request:', { scanId, format, query: req.query });
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
    
    if (format === 'html' && scanInfo.result) {
        // Persist and return HTML report. Prefer project's Python renderer for exact parity if available.
        try {
            const reportsDir = path.join(__dirname, '../reports');
            await fs.mkdir(reportsDir, { recursive: true });
            const htmlPath = path.join(reportsDir, `security_report_${scanId}.html`);

            // First try to use Python renderer if present
            const pythonRenderer = path.join(__dirname, '../Vulnerability_Tool_V2/tools/render_from_json.py');
            const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
            const projectRoot = path.join(__dirname, '..');

            if (await fs.access(pythonRenderer).then(() => true).catch(() => false)) {
                // write JSON temp file (in project reports dir)
                const tmpJson = path.join(reportsDir, `tmp_${scanId}.json`);
                await fs.writeFile(tmpJson, JSON.stringify(scanInfo.result, null, 2));

                // Try venv python first, then system python3, then python
                const pythonCandidates = [
                    path.join(scannerPath, 'venv', 'bin', 'python'),
                    'python3',
                    'python'
                ];

                let spawnRes = null;
                let usedPython = null;
                for (const py of pythonCandidates) {
                    try {
                        spawnRes = spawnSync(py, [pythonRenderer, tmpJson, htmlPath], { cwd: projectRoot, encoding: 'utf8' });
                    } catch (e) {
                        spawnRes = { error: e };
                    }
                    if (spawnRes && !spawnRes.error && spawnRes.status === 0) {
                        usedPython = py;
                        break;
                    }
                }

                // remove tmp
                try { await fs.unlink(tmpJson); } catch (e) {}

                // If helper succeeded but file somehow ended up under the scanner's own reports folder,
                // move it into the project reports dir so we have a single canonical location.
                const altPath = path.join(scannerPath, 'reports', path.basename(htmlPath));
                const altExists = await fs.access(altPath).then(() => true).catch(() => false);
                const htmlExists = await fs.access(htmlPath).then(() => true).catch(() => false);

                if (!htmlExists && altExists) {
                    // move into expected reportsDir
                    try {
                        await fs.mkdir(reportsDir, { recursive: true });
                        await fs.rename(altPath, htmlPath);
                    } catch (moveErr) {
                        // ignore move error and keep track of alt path
                    }
                }

                // if python helper failed or file still missing, fallback to JS renderer
                const finalHtmlExists = await fs.access(htmlPath).then(() => true).catch(() => false);
                if (!finalHtmlExists || !usedPython) {
                    const html = generateHTMLReport(scanInfo.result);
                    await fs.writeFile(htmlPath, html);
                }
            } else {
                // No python helper available; use JS renderer
                const html = generateHTMLReport(scanInfo.result);
                await fs.writeFile(htmlPath, html);
            }

            // Attach path to scanInfo and send as downloadable file
            // Prefer project reports dir, but if missing, check scanner's own reports folder
            const projectHtmlPath = path.join(__dirname, '../reports', `security_report_${scanId}.html`);
            const scannerHtmlPath = path.join(__dirname, '../Vulnerability_Tool_V2/reports', `security_report_${scanId}.html`);
            const projectExists = await fs.access(projectHtmlPath).then(() => true).catch(() => false);
            const scannerExists = await fs.access(scannerHtmlPath).then(() => true).catch(() => false);
            let finalPath = null;
            if (projectExists) finalPath = projectHtmlPath;
            else if (scannerExists) finalPath = scannerHtmlPath;
            else finalPath = htmlPath; // fallback to whatever we wrote earlier

            // record chosen path
            scanInfo.reportPath = finalPath;
            const htmlContent = await fs.readFile(finalPath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="security_report_${scanId}.html"`);
            res.send(htmlContent);
            return;
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to generate HTML report', details: err.message });
            return;
        }
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

// Debug endpoint: return raw python stdout and JSON candidates for a scan (useful for diagnosing parsing issues)
router.get('/scan/:scanId/raw', (req, res) => {
    const { scanId } = req.params;
    const scanInfo = activeScanners.get(scanId);
    if (!scanInfo) {
        return res.status(404).json({ success: false, error: 'Scan ID not found' });
    }

    const raw = scanInfo.rawOutput || '';
    const candidates = collectJSONCandidates(raw);
    res.json({ scan_id: scanId, status: scanInfo.status, progress: scanInfo.progress, raw_preview: raw.slice(0, 4000), candidate_count: candidates.length, candidates: candidates.slice(-3) });
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
        
    const scanId = generateScanId();
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
    // save raw output for debugging
    
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
    if (scanInfo) scanInfo.rawOutput = outputData;
        if (!scanInfo) return;
        
        if (code === 0) {
            try {
        const result = parseBestJSON(outputData);
                scanInfo.status = 'completed';
                scanInfo.progress = 100;
                scanInfo.message = 'Scan completed successfully';
                scanInfo.result = result;

                // If there is HTML output, save it as well
                if (outputFormat === 'html') {
                    scanInfo.htmlReport = generateHTMLReport(result);
                    // persist into project reports dir for easy discovery (async IIFE)
                    (async () => {
                        try {
                            const reportsDir = path.join(__dirname, '../reports');
                            await fs.mkdir(reportsDir, { recursive: true });
                            const htmlPath = path.join(reportsDir, `security_report_${scanId}.html`);
                            await fs.writeFile(htmlPath, scanInfo.htmlReport);
                            scanInfo.reportPath = htmlPath;
                        } catch (e) {
                            // if writing to project reports fails, leave as-is and record message
                            scanInfo.message = (scanInfo.message || '') + `; Failed to persist html report: ${e.message}`;
                        }
                    })();
                }
            } catch (error) {
                // Persist raw output to disk for post-mortem analysis
                (async () => {
                    try {
                        const reportsDir = path.join(__dirname, '../reports');
                        await fs.mkdir(reportsDir, { recursive: true });
                        const rawPath = path.join(reportsDir, `raw_${scanId}.log`);
                        await fs.writeFile(rawPath, outputData);
                        scanInfo.rawOutputPath = rawPath;
                        scanInfo.status = 'failed';
                        scanInfo.message = `Failed to parse scan result: ${error.message}. Raw output saved to: ${rawPath}`;
                    } catch (fsErr) {
                        scanInfo.status = 'failed';
                        scanInfo.message = `Failed to parse scan result: ${error.message}. Also failed to write raw output: ${fsErr.message}`;
                    }
                })();
            }
        } else {
            // Save raw output for non-zero exit as well
            (async () => {
                try {
                    const reportsDir = path.join(__dirname, '../reports');
                    await fs.mkdir(reportsDir, { recursive: true });
                    const rawPath = path.join(reportsDir, `raw_${scanId}.log`);
                    await fs.writeFile(rawPath, outputData + '\n\nSTDERR:\n' + errorData);
                    scanInfo.rawOutputPath = rawPath;
                    scanInfo.status = 'failed';
                    scanInfo.message = `Scan failed with code ${code}. Raw output saved to: ${rawPath}`;
                } catch (fsErr) {
                    scanInfo.status = 'failed';
                    scanInfo.message = `Scan failed with code ${code}: ${errorData}. Also failed to write raw output: ${fsErr.message}`;
                }
            })();
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
                    const result = parseBestJSON(outputData);
                    resolve(result);
                } catch (error) {
                    // persist raw output to disk for debugging
                    (async () => {
                        try {
                            const reportsDir = path.join(__dirname, '../reports');
                            await fs.mkdir(reportsDir, { recursive: true });
                            const rawPath = path.join(reportsDir, `raw_sync_${Date.now()}.log`);
                            await fs.writeFile(rawPath, outputData);
                            reject(new Error(`Failed to parse scan result: ${error.message}. Raw output saved to: ${rawPath}`));
                        } catch (fsErr) {
                            reject(new Error(`Failed to parse scan result: ${error.message}. Also failed to write raw output: ${fsErr.message}`));
                        }
                    })();
                }
            } else {
                (async () => {
                    try {
                        const reportsDir = path.join(__dirname, '../reports');
                        await fs.mkdir(reportsDir, { recursive: true });
                        const rawPath = path.join(reportsDir, `raw_sync_${Date.now()}.log`);
                        await fs.writeFile(rawPath, outputData + '\n\nSTDERR:\n' + errorData);
                        reject(new Error(`Scan failed with code ${code}. Raw output saved to: ${rawPath}`));
                    } catch (fsErr) {
                        reject(new Error(`Scan failed with code ${code}: ${errorData}. Also failed to write raw output: ${fsErr.message}`));
                    }
                })();
            }
        });
    });
}

// Extract the last complete top-level JSON object or array from a string that may
// contain surrounding logs. It scans for balanced '{'..'}' and '['..']' while
// respecting string literals and escapes. Returns the last complete JSON candidate.
// Collect all complete top-level JSON candidates from text and return array
function collectJSONCandidates(text) {
    if (!text || typeof text !== 'string') return [];

    const candidates = [];
    const len = text.length;
    let inString = false;
    let escape = false;
    let depth = 0;
    let start = -1;

    for (let i = 0; i < len; i++) {
        const ch = text[i];
        if (inString) {
            if (escape) { escape = false; }
            else if (ch === '\\') { escape = true; }
            else if (ch === '"') { inString = false; }
            continue;
        }
        if (ch === '"') { inString = true; continue; }

        if ((ch === '{' || ch === '[') && start === -1) {
            start = i;
            depth = 1;
            continue;
        }

        if (start !== -1) {
            if (ch === '{' || ch === '[') depth++;
            else if (ch === '}' || ch === ']') {
                depth--;
                if (depth === 0) {
                    candidates.push(text.substring(start, i + 1).trim());
                    start = -1;
                }
            }
        }
    }
    return candidates;
}

// Try to parse the best JSON object found in text.
// Strategy:
// 1) collect candidates and try parse from last to first
// 2) if direct parse fails, try bounded tail-trimming retries on that candidate
function parseBestJSON(text) {
    const candidates = collectJSONCandidates(text);
    if (!candidates || candidates.length === 0) throw new Error('No JSON object or array found in output');

    const maxTrimAttempts = 200; // bounded attempts to trim tail
    for (let ci = candidates.length - 1; ci >= 0; ci--) {
        let cand = candidates[ci];
        // try direct parse
        try {
            return JSON.parse(cand);
        } catch (err) {
            // if parse failed, try trimming tail progressively (but bounded)
            for (let t = 0; t < maxTrimAttempts && cand.length > 2; t++) {
                // remove up to t+1 chars from end
                const newLen = Math.max(0, cand.length - (t + 1));
                const substr = cand.substring(0, newLen).trim();
                try {
                    return JSON.parse(substr);
                } catch (e2) {
                    // continue trimming
                }
            }
        }
    }

    throw new Error('Failed to parse any JSON candidate from output');
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