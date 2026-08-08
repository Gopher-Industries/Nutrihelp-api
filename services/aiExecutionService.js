const childProcess = require('child_process');
const path = require('path');
const monitor = require('./aiServiceMonitor');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PYTHON_COMMAND = process.env.PYTHON_BIN || 'python3';
const DEFAULT_MAX_RETRIES = 1; // 1 retry = 2 total attempts
const RETRY_DELAY_MS = 500;

function tryParseJson(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeResult({
  stdout,
  stderr,
  exitCode,
  timedOut,
  scriptPath,
  timeoutMs,
}) {
  const parsedStdout = tryParseJson(stdout.trim());
  const parsedStderr = tryParseJson(stderr.trim());
  const parsedPayload = parsedStdout || parsedStderr;

  if (parsedPayload) {
    return {
      success:
        !timedOut &&
        exitCode === 0 &&
        parsedPayload.success !== false,
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
      ? `AI script timed out after ${timeoutMs}ms`
      : trimmedStderr ||
        trimmedStdout ||
        `AI script failed: ${path.basename(scriptPath)}`,
    metadata: null,
    warnings: [],
    stdout,
    stderr,
    exitCode,
    timedOut,
    data: null,
  };
}

/**
 * Execute a single Python script invocation.
 * Returns a normalised result and never throws.
 */
function _spawnOnce({
  scriptPath,
  args,
  stdin,
  timeoutMs,
  cwd,
  env,
  pythonCommand,
}) {
  return new Promise((resolve) => {
    let pythonProcess;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const resolveOnce = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      pythonProcess = childProcess.spawn(
        pythonCommand,
        [scriptPath, ...args],
        {
          cwd,
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
    } catch (spawnError) {
      return resolveOnce({
        success: false,
        prediction: null,
        confidence: null,
        error: `Failed to start AI script: ${spawnError.message}`,
        metadata: null,
        warnings: [],
        stdout: '',
        stderr: spawnError.message,
        exitCode: null,
        timedOut: false,
        data: null,
      });
    }

    const timeoutHandle = setTimeout(() => {
      timedOut = true;

      try {
        pythonProcess.kill('SIGKILL');
      } catch {
        // Best-effort process termination.
      }
    }, timeoutMs);

    pythonProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    /*
     * Prevent EPIPE/write EOF errors from crashing Node when the Python
     * process exits before all input bytes have been written.
     */
    pythonProcess.stdin.on('error', (error) => {
      stderr += stderr
        ? `\nPython stdin error: ${error.message}`
        : `Python stdin error: ${error.message}`;
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeoutHandle);

      resolveOnce({
        success: false,
        prediction: null,
        confidence: null,
        error: `Failed to start AI script: ${error.message}`,
        metadata: null,
        warnings: [],
        stdout,
        stderr: stderr
          ? `${stderr}\n${error.message}`
          : error.message,
        exitCode: null,
        timedOut: false,
        data: null,
      });
    });

    pythonProcess.on('close', (exitCode) => {
      clearTimeout(timeoutHandle);

      resolveOnce(
        normalizeResult({
          stdout,
          stderr,
          exitCode,
          timedOut,
          scriptPath,
          timeoutMs,
        })
      );
    });

    /*
     * end(stdin) writes the data and closes the stream in one operation.
     * This is safer than calling write() followed by end().
     */
    try {
      if (stdin !== null && stdin !== undefined) {
        pythonProcess.stdin.end(stdin);
      } else {
        pythonProcess.stdin.end();
      }
    } catch (error) {
      stderr += stderr
        ? `\nPython stdin error: ${error.message}`
        : `Python stdin error: ${error.message}`;
    }
  });
}

/**
 * Execute a Python script with optional retry and circuit-breaker support.
 */
async function executePythonScript({
  scriptPath,
  args = [],
  stdin = null,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cwd = process.cwd(),
  env = process.env,
  pythonCommand = env.PYTHON_BIN || DEFAULT_PYTHON_COMMAND,
  maxRetries = DEFAULT_MAX_RETRIES,
  serviceName = path.basename(scriptPath, '.py'),
  skipCircuit = false,
}) {
  if (!skipCircuit && monitor.isCircuitOpen(serviceName)) {
    const circuitError = {
      success: false,
      prediction: null,
      confidence: null,
      error: `AI service "${serviceName}" is temporarily unavailable (circuit open).`,
      metadata: null,
      warnings: ['circuit_open'],
      stdout: '',
      stderr: '',
      exitCode: null,
      timedOut: false,
      data: null,
    };

    monitor.record(serviceName, circuitError, 0);
    return circuitError;
  }

  const totalAttempts = 1 + Math.max(0, maxRetries);
  let lastResult;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const start = Date.now();

    const result = await _spawnOnce({
      scriptPath,
      args,
      stdin,
      timeoutMs,
      cwd,
      env,
      pythonCommand,
    });

    const durationMs = Date.now() - start;

    monitor.record(serviceName, result, durationMs, {
      attempt,
      scriptPath,
    });

    monitor.recordCircuit(serviceName, result.success);

    lastResult = result;

    if (result.success || result.timedOut) {
      break;
    }

    if (attempt < totalAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }

  return lastResult;
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_PYTHON_COMMAND,
  executePythonScript,
};