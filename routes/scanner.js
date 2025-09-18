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
// Generate scan id in style: YYYYMMDD_HHMMSS_<tag>
// tag defaults to 'scan' but can be set to 'quick-scan' or others. Keeps filename-safe characters.
// Generate canonical timestamp ID: YYYYMMDD_HHMMSS
// The optional tag is no longer embedded into the canonical ID; callers
// should record the tag separately and filenames are built with the helper
// below to append an optional tag suffix (e.g. _quick-scan).
function generateScanId(tag = 'scan') {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const YYYY = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const DD = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${YYYY}${MM}${DD}_${hh}${mm}${ss}`;
}

    // Resolve a usable python executable: prefer venv, then system python3, then python
    // Returns the executable name/path string or null if none found.
    async function resolvePythonExecutable(scannerRoot) {
        const { spawnSync } = require('child_process');
        const path = require('path');
        const candidates = [
            path.join(scannerRoot, 'venv', 'bin', 'python'),
            'python3',
            'python'
        ];
        for (const c of candidates) {
            try {
                const res = spawnSync(c, ['--version'], { encoding: 'utf8' });
                if (!res.error && (res.status === 0 || (res.stdout || res.stderr))) {
                    return c;
                }
            } catch (e) {
                // ignore and try next
            }
        }
        return null;
    }

// Compose a filename-safe identifier from the canonical timestamp id and an optional tag.
function formatScanIdWithTag(scanId, tag) {
    const cleanTag = tag ? String(tag).replace(/[^a-zA-Z0-9_-]/g, '-') : '';
    return `${scanId}${cleanTag ? '_' + cleanTag : ''}`;
}

// Find a file in 'dir' that starts with prefix and ends with ext. Returns null if none found.
async function findFileWithPrefix(dir, prefix, ext) {
    try {
        const entries = await fs.readdir(dir);
        for (const e of entries) {
            if (e.startsWith(prefix) && e.endsWith(ext)) return path.join(dir, e);
        }
    } catch (e) {
        return null;
    }
    return null;
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
 *         key:
 *           type: string
 *           description: internal plugin key (used by scanner)
 *         version:
 *           type: string
 *           description: plugin version if available
 *         available:
 *           type: boolean
 *           description: whether plugin directory exists in the scanner package
 *         enabled:
 *           type: boolean
 *           description: whether plugin is enabled in scanner config (null if unknown)
 *         severity_level:
 *           type: string
 *           description: default severity level assigned to findings from this plugin
 *         target_path:
 *           type: string
 *           description: Target path to scan
 *           example: "./routes"
 *         plugins:
 *           type: array
 *           items:
 *             type: string
 *           description: Specify the plugin to use
 *           example:
 *             - "JWTMissingProtectionPlugin"
 *             - "JWTConfigurationPlugin"
 *         output_format:
 *           type: string
 *           enum: [json, html]
 *           default: json
 *           description: Output format
 *       example:
 *         target_path: "./routes"
 *         plugins:
 *           - "JWTMissingProtectionPlugin"
 *           - "JWTConfigurationPlugin"
 *         output_format: "json"
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
        // Dynamically construct available plugin list to reflect the scanner's plugins
        const scannerRoot = path.join(__dirname, '../Vulnerability_Tool_V2');
        const pluginsDir = path.join(scannerRoot, 'plugins');

        // Plugin mappings mirror Vulnerability_Tool_V2/core/scanner_engine.py
        // Note: plugin key => folder name mapping (some plugins group under subpackage like jwt_security)
        const pluginMappings = {
            'jwt_missing_protection': { name: 'JWTMissingProtectionPlugin', default_severity: 'HIGH', folder: 'jwt_security' },
            'jwt_configuration': { name: 'JWTConfigurationPlugin', default_severity: 'MEDIUM', folder: 'jwt_security' },
            'general_security': { name: 'general_security', default_severity: 'MEDIUM', folder: 'general_security' }
        };

        // Try to read scanner config to determine enabled state when possible
        let enabledPluginsConfig = {};
        try {
            const configPath = path.join(scannerRoot, 'config', 'scanner_config.yaml');
            const exists = await fs.access(configPath).then(() => true).catch(() => false);
            if (exists) {
                const yaml = require('yamljs');
                const cfg = yaml.load(configPath) || {};
                enabledPluginsConfig = cfg.plugins || {};
            }
        } catch (e) {
            // ignore config read errors; we'll fall back to defaults
        }

        const plugins = [];
        for (const [key, meta] of Object.entries(pluginMappings)) {
            const pluginFolder = path.join(pluginsDir, meta.folder || key);
            const available = await fs.access(pluginFolder).then(() => true).catch(() => false);

            // defaults
            let description = '';
            let version = null;

            if (available) {
                // Try to read __init__.py to get metadata heuristically
                try {
                    const initPath = path.join(pluginFolder, '__init__.py');
                    const initExists = await fs.access(initPath).then(() => true).catch(() => false);
                    if (initExists) {
                        const content = await fs.readFile(initPath, 'utf8');
                        // attempt to extract description and version strings from get_plugin_info
                        const descMatch = content.match(/description\s*[:=]\s*['\"]([\s\S]*?)['\"]/i);
                        const verMatch = content.match(/version\s*[:=]\s*['\"]([\w\.\-]+)['\"]/i);
                        if (descMatch) description = descMatch[1].trim();
                        if (verMatch) version = verMatch[1].trim();
                    }
                } catch (e) {
                    // best-effort only
                }
            }

            // fallback description if not found
            if (!description) {
                if (meta.name === 'general_security') description = 'Detect generic security issues such as hardcoded secrets, DB URLs and permissive CORS.';
                else if (meta.name === 'JWTMissingProtectionPlugin') description = 'Detect missing JWT protection in API endpoints';
                else if (meta.name === 'JWTConfigurationPlugin') description = 'Validate JWT configuration security';
            }

            const cfg = enabledPluginsConfig[key];
            // Follow scanner_v2.py semantics: general_security should be enabled by default if not present in config
            let enabled = null;
            if (cfg && typeof cfg.enabled === 'boolean') enabled = cfg.enabled;
            else if (key === 'general_security') enabled = true;

            plugins.push({
                key,
                name: meta.name,
                description,
                version,
                severity_level: meta.default_severity,
                available,
                enabled
            });
        }

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
    // For normal async scans, use default tag 'scan'
    const scanTag = 'scan';

    // Start asynchronous scan and pass tag so filenames can include it as a suffix
    startPythonScan(scanId, scanTag, target_path, plugins, output_format);
        
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
 *         description: ScanID
 *     responses:
 *       200:
 *         description: Scan Status
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
        try {
            const reportsDir = path.join(process.cwd(), 'reports');
            const jsonPrefix = `Vulnerability_Scan_Result_${scanId}`;
            const projectReportJson = await findFileWithPrefix(reportsDir, jsonPrefix, '.json');

            if (projectReportJson) {
                const data = await fs.readFile(projectReportJson, 'utf8');
                scanInfo = { status: 'completed', result: JSON.parse(data) };
            } else {
                // Try HTML in scanner's reports dir
                const scannerReportsDir = path.join(process.cwd(), 'Vulnerability_Tool_V2', 'reports');
                const htmlPrefix = `Vulnerability_Scan_Report_${scanId}`;
                const scannerReportHtml = await findFileWithPrefix(scannerReportsDir, htmlPrefix, '.html');

                if (scannerReportHtml) {
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
        // Persist and return HTML report. Prefer the scanner's reports dir for storage.
        try {
            const scannerReportsDir = path.join(__dirname, '../Vulnerability_Tool_V2', 'reports');
            await fs.mkdir(scannerReportsDir, { recursive: true });
            const htmlPath = path.join(scannerReportsDir, `Vulnerability_Scan_Report_${scanId}.html`);

            // First try to use Python renderer if present
            const pythonRenderer = path.join(__dirname, '../Vulnerability_Tool_V2/tools/render_from_json.py');
            const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');

            if (await fs.access(pythonRenderer).then(() => true).catch(() => false)) {
                // write JSON temp file (in scanner reports dir)
                const tmpJson = path.join(scannerReportsDir, `tmp_${scanId}.json`);
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
                        spawnRes = spawnSync(py, [pythonRenderer, tmpJson, htmlPath], { cwd: scannerPath, encoding: 'utf8' });
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

                // If python helper failed or file still missing, fallback to JS renderer
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

            // Prefer scanner reports dir, but as a fallback check project reports dir for any legacy files
            const projectReportsDir = path.join(__dirname, '../reports');

            // Try to find the actual HTML file which may include an optional tag suffix
            let finalPath = await findFileWithPrefix(scannerReportsDir, `Vulnerability_Scan_Report_${scanId}`, '.html');
            if (!finalPath) finalPath = await findFileWithPrefix(projectReportsDir, `Vulnerability_Scan_Report_${scanId}`, '.html');
            if (!finalPath) finalPath = htmlPath; // fallback to whatever we wrote earlier

            // record chosen path and stream it
            scanInfo.reportPath = finalPath;
            const htmlContent = await fs.readFile(finalPath, 'utf-8');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(finalPath)}"`);
            res.send(htmlContent);
            return;
        } catch (err) {
            res.status(500).json({ success: false, error: 'Failed to generate HTML report', details: err.message });
            return;
        }
    } else if (format === 'json') {
        // attempt to find persisted json with optional tag; prefer scanner reports dir
        const scannerReportsDir = path.join(__dirname, '../Vulnerability_Tool_V2/reports');
        const projectReportsDir = path.join(__dirname, '../reports');
        let jsonPath = await findFileWithPrefix(scannerReportsDir, `Vulnerability_Scan_Result_${scanId}`, '.json');
        if (!jsonPath) jsonPath = await findFileWithPrefix(projectReportsDir, `Vulnerability_Scan_Result_${scanId}`, '.json');
        if (jsonPath) res.setHeader('Content-Disposition', `attachment; filename="${path.basename(jsonPath)}"`);
        else res.setHeader('Content-Disposition', `attachment; filename=\"Vulnerability_Scan_Result_${scanId}.json\"`);
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
        // Validate target path exists (same as the async /scan endpoint)
        const targetExists = await fs.access(target_path).then(() => true).catch(() => false);
        if (!targetExists) {
            return res.status(400).json({
                success: false,
                error: `Target path does not exist: ${target_path}`
            });
        }

    const scanId = generateScanId();
    const scanTag = 'quick-scan';
    const scanIdWithTag = formatScanIdWithTag(scanId, scanTag);
    const result = await runPythonScanSync(target_path, plugins, output_format);

        // persist into activeScanners so subsequent report/status endpoints can find it
        const scanInfo = {
            status: 'completed',
            progress: 100,
            message: 'Quick scan completed',
            result: result,
            tag: scanTag,
            scan_time: new Date().toISOString()
        };

        // write report files into the scanner's own reports dir for later retrieval
        try {
            const scannerReportsDir = path.join(__dirname, '../Vulnerability_Tool_V2', 'reports');
            await fs.mkdir(scannerReportsDir, { recursive: true });
            const jsonPath = path.join(scannerReportsDir, `Vulnerability_Scan_Result_${scanIdWithTag}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(result, null, 2));

            // also generate HTML report if requested or default format
            if (output_format === 'html' || output_format === 'json') {
                // Prefer the scanner's Python renderer for consistent/identical HTML output
                const pythonRenderer = path.join(__dirname, '../Vulnerability_Tool_V2/tools/render_from_json.py');
                const htmlPath = path.join(scannerReportsDir, `Vulnerability_Scan_Report_${scanIdWithTag}.html`);
                const tmpJson = path.join(scannerReportsDir, `tmp_${scanIdWithTag}.json`);
                await fs.writeFile(tmpJson, JSON.stringify(result, null, 2));
                let wroteHtml = false;
                if (await fs.access(pythonRenderer).then(() => true).catch(() => false)) {
                    // try to run python helper (best-effort without blocking server startup)
                    const { spawnSync } = require('child_process');
                    const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
                    const pythonCandidates = [
                        path.join(scannerPath, 'venv', 'bin', 'python'),
                        'python3',
                        'python'
                    ];
                    for (const py of pythonCandidates) {
                        try {
                            const spawnRes = spawnSync(py, [pythonRenderer, tmpJson, htmlPath], { cwd: scannerPath, encoding: 'utf8' });
                            if (!spawnRes.error && spawnRes.status === 0) {
                                wroteHtml = true;
                                break;
                            }
                        } catch (e) {
                            // ignore and try next
                        }
                    }
                }

                // remove tmp json
                try { await fs.unlink(tmpJson); } catch (e) {}

                if (!wroteHtml) {
                    // fallback to JS renderer
                    const html = generateHTMLReport(result);
                    await fs.writeFile(htmlPath, html);
                }
                scanInfo.reportPath = htmlPath;
            }
        } catch (e) {
            // non-fatal: keep scanInfo in memory but log message
            scanInfo.message += `; Failed to persist reports: ${e.message}`;
        }

    activeScanners.set(scanId, scanInfo);

    // Ensure result's own scan_id (if any) doesn't override our generated scanId
    const responsePayload = Object.assign({}, result || {});
    responsePayload.scan_id = scanId;
    responsePayload.target_path = target_path;
    responsePayload.scan_time = scanInfo.scan_time;

    res.json(responsePayload);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start asynchronous Python scan
function startPythonScan(scanId, scanTag, targetPath, plugins, outputFormat) {
    activeScanners.set(scanId, {
        status: 'running',
        progress: 0,
        message: 'Scan initiated',
        tag: scanTag
    });
    
    const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
    const scriptPath = path.join(scannerPath, 'scanner_v2.py');

    // Resolve a usable python executable: prefer venv, then system python3, then python
    function resolvePythonExecutableSync(scannerRoot) {
        const { spawnSync } = require('child_process');
        const candidates = [
            path.join(scannerRoot, 'venv', 'bin', 'python'),
            'python3',
            'python'
        ];
        for (const c of candidates) {
            try {
                const res = spawnSync(c, ['--version'], { encoding: 'utf8' });
                if (!res.error && (res.status === 0 || (res.stdout || res.stderr))) {
                    return c;
                }
            } catch (e) {
                // ignore and try next
            }
        }
        return null;
    }
    
    const args = ['--target', targetPath, '--format', outputFormat];
    
    const pythonExec = resolvePythonExecutableSync(scannerPath);
    if (!pythonExec) {
        const scanInfo = activeScanners.get(scanId);
        if (scanInfo) {
            scanInfo.status = 'failed';
            scanInfo.progress = 0;
            scanInfo.message = 'No Python executable found. Expected either Vulnerability_Tool_V2/venv/bin/python or system python3. Please create a venv and install dependencies: `python3 -m venv Vulnerability_Tool_V2/venv && source Vulnerability_Tool_V2/venv/bin/activate && pip install -r Vulnerability_Tool_V2/requirements.txt`';
            scanInfo.rawOutput = (scanInfo.rawOutput || '') + '\n\nSPAWN_ERROR: No python executable found';
        }
        return;
    }

    let pythonProcess;
    try {
        pythonProcess = spawn(pythonExec, [scriptPath, ...args], {
            cwd: scannerPath
        });
    } catch (spawnErr) {
        const scanInfo = activeScanners.get(scanId);
        if (scanInfo) {
            scanInfo.status = 'failed';
            scanInfo.progress = 0;
            scanInfo.message = `Failed to start python scanner using '${pythonExec}': ${spawnErr.message || String(spawnErr)}. Tried candidates: venv/bin/python -> python3 -> python`;
            scanInfo.rawOutput = (scanInfo.rawOutput || '') + '\n\nSPAWN_ERROR:\n' + (spawnErr.stack || String(spawnErr));
        }
        return;
    }

    // handle runtime errors from the child process (e.g., exec failures)
    pythonProcess.on('error', (err) => {
        const scanInfo = activeScanners.get(scanId);
        if (scanInfo) {
            scanInfo.status = 'failed';
            scanInfo.progress = 0;
            scanInfo.message = `Python process error: ${err.message || String(err)}`;
            scanInfo.rawOutput = (scanInfo.rawOutput || '') + '\n\nPROCESS_ERROR:\n' + (err.stack || String(err));
            // persist raw output for post-mortem
            (async () => {
                try {
                    const reportsDir = path.join(__dirname, '../reports');
                    await fs.mkdir(reportsDir, { recursive: true });
                    const rawPath = path.join(reportsDir, `raw_${scanId}.log`);
                    await fs.writeFile(rawPath, scanInfo.rawOutput || (err.stack || String(err)));
                    scanInfo.rawOutputPath = rawPath;
                } catch (e) {
                    // nothing else to do
                }
            })();
        }
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
                            const idWithTag = formatScanIdWithTag(scanId, scanTag);
                            const htmlPath = path.join(reportsDir, `Vulnerability_Scan_Report_${idWithTag}.html`);
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
            // Try to salvage a result if the python process printed JSON despite non-zero exit
            try {
                const maybeResult = parseBestJSON(outputData);
                scanInfo.status = 'completed';
                scanInfo.progress = 100;
                scanInfo.message = `Scan completed with non-zero exit code ${code} but output parsed successfully`;
                scanInfo.result = maybeResult;
            } catch (parseErr) {
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
        }
    });
}

// Run Python scan synchronously
function runPythonScanSync(targetPath, plugins, outputFormat) {
    return new Promise((resolve, reject) => {
        const scannerPath = path.join(__dirname, '../Vulnerability_Tool_V2');
        const scriptPath = path.join(scannerPath, 'scanner_v2.py');
        
    // Use the requested output format (was hard-coded to 'json')
    const args = ['--target', targetPath, '--format', outputFormat || 'json'];
        (async () => {
            const pythonExec = await resolvePythonExecutable(scannerPath);
            if (!pythonExec) {
                return reject(new Error('No usable Python executable found. Please create Vulnerability_Tool_V2/venv or ensure python3 is available and scanner dependencies are installed.'));
            }

            const pythonProcess = spawn(pythonExec, [scriptPath, ...args], {
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
                // Attempt to salvage a valid JSON result even when the process exited with non-zero code.
                try {
                    const maybeResult = parseBestJSON(outputData);
                    // resolved with parsed result; caller will treat as successful quick-scan
                    resolve(maybeResult);
                    return;
                } catch (parseErr) {
                    // if parsing fails, persist raw output and reject as before
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
            }
            });
        })();
    });
}

// Collect JSON candidates from text by tracking balanced braces/brackets
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

// Attempt to parse the best JSON candidate from text, with progressive trimming if needed
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
    <title>NutriHelp Vulnerability Scan Report</title>
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