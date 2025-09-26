#!/usr/bin/env node
/**
 * bootstrap.js
 * One-shot developer setup script: Node deps, scanner venv deps, env template, validation.
 * Modes:
 *   full (default)      - Used by "npm run setup" (hard fail on validation errors)
 *   postinstall         - Used automatically after npm install (soft fail: warns only)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const modeArg = process.argv.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'full';
const soft = mode === 'postinstall';

function log(msg){ console.log(`[bootstrap] ${msg}`); }
function warn(msg){ console.warn(`[bootstrap] WARN: ${msg}`); }
function run(cmd,args,opts){
  const r = spawnSync(cmd,args,Object.assign({stdio:'inherit'},opts));
  if (r.status !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    if (!soft) process.exit(r.status || 1);
    else warn(`Continuing despite failure (mode=${mode})`);
  }
}

// 1. Install Node dependencies if node_modules missing
if (!fs.existsSync(path.join(__dirname,'..','node_modules'))) {
  log('Installing Node dependencies (npm ci fallback to npm install)...');
  let res = spawnSync('npm',['ci'],{stdio:'inherit'});
  if (res.status !== 0) {
    log('npm ci failed, trying npm install');
    res = spawnSync('npm',['install'],{stdio:'inherit'});
    if (res.status !== 0) {
      if (!soft) process.exit(res.status);
      else warn('Node dependency installation failed during postinstall mode. Project may be unusable.');
    }
  }
} else {
  log('node_modules present, skipping npm install');
}

// 2. Ensure .env (create from example if available)
const envPath = path.join(__dirname,'..','.env');
const examplePath = path.join(__dirname,'..','.env.example');
if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('Created .env from .env.example');
  } else {
    fs.writeFileSync(envPath, '# Auto-generated minimal env (edit with real internal secrets)\nJWT_SECRET=change_me_replace_before_prod\nSUPABASE_URL=your_supabase_url\nSUPABASE_ANON_KEY=your_public_anon_key\nPORT=3000\n');
    log('Generated minimal .env (placeholders).');
  }
} else {
  log('.env already exists, not touching');
}

// 3. Prepare scanner (venv + deps)
log('Preparing vulnerability scanner environment...');
run(process.execPath, [path.join(__dirname,'prepareScanner.js')]);

// 4. Validate environment
log('Validating environment variables...');
const val = spawnSync('npm',['run','validate-env'],{stdio:'inherit'});
if (val.status !== 0) {
  if (soft) {
    warn('Environment validation reported issues (non-fatal in postinstall mode).');
  } else {
    process.exit(val.status);
  }
}

console.log(`\n✅ Bootstrap complete (mode=${mode}). You can now run: npm start`);
