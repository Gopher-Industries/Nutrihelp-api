#!/usr/bin/env node
/**
 * prepareScanner.js
 * Recreates Python virtual environment for Vulnerability_Tool_V2 (idempotent) and installs dependencies.
 * Safe to run multiple times. Skips work if already up to date. Gracefully degrades if Python is missing.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const scannerRoot = path.join(__dirname, '..', 'Vulnerability_Tool_V2');
const reqFile = path.join(scannerRoot, 'requirements.txt');
const venvDir = path.join(scannerRoot, 'venv');

function log(msg){ console.log(`[prepare-scanner] ${msg}`); }
function warn(msg){ console.warn(`[prepare-scanner] WARN: ${msg}`); }
function err(msg){ console.error(`[prepare-scanner] ERROR: ${msg}`); }

if (!fs.existsSync(scannerRoot)) {
	warn(`Scanner directory not found at ${scannerRoot}, skipping.`);
	process.exit(0);
}

// Determine python executable candidates (prefer explicit override and local project .venv before global)
const localProjectVenv = process.platform === 'win32'
	? path.join(__dirname,'..','.venv','Scripts','python.exe')
	: path.join(__dirname,'..','.venv','bin','python');
const envOverride = process.env.PYTHON_EXECUTABLE && process.env.PYTHON_EXECUTABLE.trim();
const pythonCandidates = [envOverride, localProjectVenv, 'python3', 'python', 'py'].filter(Boolean);
let pythonExe = null;
for (const c of pythonCandidates) {
	try {
		const res = spawnSync(c, ['--version'], { encoding: 'utf8' });
		if (!res.error && res.status === 0) { pythonExe = c; break; }
	} catch (_) {}
}
if (!pythonExe) {
	warn('No usable python interpreter (exit status 0) found. Skipping scanner setup.');
	warn('API will run; scanner endpoints will be unavailable until Python is installed.');
	process.exit(0);
}

// Create venv if missing
if (!fs.existsSync(venvDir)) {
	log(`Creating virtual environment: ${pythonExe} -m venv venv`);
	const create = spawnSync(pythonExe, ['-m','venv','venv'], { cwd: scannerRoot, stdio:'inherit' });
	if (create.status !== 0) {
		err('Failed to create scanner venv. You may create it manually then rerun this script.');
		process.exit(0); // degrade gracefully
	}
} else {
	log('Scanner venv already exists, skipping creation');
}

// Locate pip
const pipPath = process.platform === 'win32'
	? path.join(venvDir,'Scripts','pip.exe')
	: path.join(venvDir,'bin','pip');
if (!fs.existsSync(pipPath)) {
	err(`pip not found at ${pipPath}`);
	process.exit(1);
}

if (!fs.existsSync(reqFile)) {
	warn('requirements.txt not found, skipping dependency install');
	process.exit(0);
}

// Dependency change detection marker
const marker = path.join(venvDir, '.deps_hash');
let needInstall = true;
try {
	const reqStat = fs.statSync(reqFile).mtimeMs;
	const markerData = fs.existsSync(marker) ? fs.readFileSync(marker,'utf8') : '';
	if (markerData.trim() === String(reqStat)) needInstall = false; else fs.writeFileSync(marker, String(reqStat));
} catch { /* ignore */ }

if (!needInstall) {
	log('Dependencies already up to date, skipping pip install');
	process.exit(0);
}

log('Installing Python scanner dependencies...');
const install = spawnSync(pipPath, ['install','-r','requirements.txt'], { cwd: scannerRoot, stdio:'inherit' });
if (install.status !== 0) {
	err('pip install failed');
	process.exit(1);
}
log('Scanner dependencies installed successfully.');

