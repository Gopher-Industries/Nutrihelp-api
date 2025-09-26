#!/usr/bin/env node
/**
 * ensureScannerReady.js
 * Lightweight check to confirm scanner venv & core dependencies exist; if not, call prepareScanner.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scannerRoot = path.join(__dirname, '..', 'Vulnerability_Tool_V2');
const venvDir = path.join(scannerRoot, 'venv');
const markerPip = process.platform === 'win32' ? path.join(venvDir,'Scripts','pip.exe') : path.join(venvDir,'bin','pip');

function log(m){ console.log(`[ensure-scanner] ${m}`); }
function run(cmd, args, opts={}){ return spawnSync(cmd,args,Object.assign({encoding:'utf8'},opts)); }

if (!fs.existsSync(scannerRoot)) {
  log('Scanner root not found, nothing to ensure.');
  process.exit(0);
}

let needPrepare = false;
if (!fs.existsSync(venvDir)) needPrepare = true;
if (!fs.existsSync(markerPip)) needPrepare = true;

// quick module import probe (yaml, jinja2) using venv python if present
if (!needPrepare) {
  const pyExe = process.platform === 'win32' ? path.join(venvDir,'Scripts','python.exe') : path.join(venvDir,'bin','python');
  if (fs.existsSync(pyExe)) {
    const probe = run(pyExe, ['-c','import yaml,jinja2']);
    if (probe.status !== 0) needPrepare = true;
  } else {
    needPrepare = true;
  }
}

if (needPrepare) {
  log('Scanner environment incomplete; running prepare-scanner');
  const prep = run(process.execPath, [path.join(__dirname,'prepareScanner.js')], { stdio:'inherit' });
  process.exit(prep.status || 0);
} else {
  log('Scanner environment is ready.');
}
