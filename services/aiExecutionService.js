const { spawn } = require('child_process');
const path = require('path');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PYTHON_COMMAND = process.env.PYTHON_BIN || 'python3';

function tryParseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function normalizeResult({ stdout, stderr, exitCode, timedOut, scriptPath }) {
  const parsedStdout = tryParseJson(stdout.trim());
  const parsedStderr = tryParseJson(stderr.trim());
  const parsedPayload = parsedStdout || parsedStderr;

  if (parsedPayload) {
    return {
      success: !timedOut && exitCode === 0 && parsedPayload.success !== false,
      prediction: parsedPayload.prediction ?? null,
      confidence: parsedPayload.confidence ?? null,
      error: parsedPayload.error || null,
      metadata: parsedPayload.metadata ?? null,
      warnings: parsedPayload.warnings ?? [],
      stdout,
      stderr,
      exitCode,
      timedOut,
      data: parsedPayload,
    };
  }

  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();

  if (!timedOut && exitCode === 0 && trimmedStdout) {
    return {
      success: true,
      prediction: trimmedStdout,
      confidence: null,
      error: null,
      metadata: null,
      warnings: [],
      stdout,
      stderr,
      exitCode,
      timedOut,
      data: {
        success: true,
        prediction: trimmedStdout,
        confidence: null,
        error: null,
      },
    };
  }

  return {
    success: false,
    prediction: null,
    confidence: null,
    error: timedOut
      ? `AI script timed out after ${DEFAULT_TIMEOUT_MS}ms`
      : trimmedStderr || trimmedStdout || `AI script failed: ${path.basename(scriptPath)}`,
    metadata: null,
    warnings: [],
    stdout,
    stderr,
    exitCode,
    timedOut,
    data: null,
  };
}

function executePythonScript({
  scriptPath,
  args = [],
  stdin = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cwd = process.cwd(),
  env = process.env,
  pythonCommand = env.PYTHON_BIN || DEFAULT_PYTHON_COMMAND,
}) {
  return new Promise((resolve) => {
    const pythonProcess = spawn(pythonCommand, [scriptPath, ...args], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGKILL');
    }, timeoutMs);

    pythonProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeoutHandle);

      resolve({
        success: false,
        prediction: null,
        confidence: null,
        error: `Failed to start AI script: ${error.message}`,
        metadata: null,
        warnings: [],
        stdout,
        stderr: stderr ? `${stderr}\n${error.message}` : error.message,
        exitCode: null,
        timedOut: false,
        data: null,
      });
    });

    pythonProcess.on('close', (exitCode) => {
      clearTimeout(timeoutHandle);

      const normalized = normalizeResult({
        stdout,
        stderr,
        exitCode,
        timedOut,
        scriptPath,
      });

      if (timedOut) {
        normalized.error = `AI script timed out after ${timeoutMs}ms`;
      }

      resolve(normalized);
    });

    if (stdin !== null && stdin !== undefined) {
      pythonProcess.stdin.write(stdin);
    }

    pythonProcess.stdin.end();
  });
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_PYTHON_COMMAND,
  executePythonScript,
};
