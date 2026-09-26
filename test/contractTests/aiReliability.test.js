/**
 * AI Service Reliability Tests
 *
 * Tests retry logic, circuit breaker, timeout handling, and monitoring hooks.
 * Uses jest.spyOn on child_process.spawn to avoid hoisting issues with jest.mock.
 */

const { EventEmitter } = require('events');
const childProcess = require('child_process');

let spawnSpy;

// Load modules once — resetModules() breaks the spyOn connection
const { executePythonScript } = require('../../services/aiExecutionService');
const monitor = require('../../services/aiServiceMonitor');

// ── Spawn helpers ──────────────────────────────────────────────────────────

function makeProcess(stdoutData, stderrData, exitCode, delayMs = 10) {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };
  proc.kill = jest.fn(() => {
    clearTimeout(proc._timer);
    setTimeout(() => proc.emit('close', null), 5);
  });

  proc._timer = setTimeout(() => {
    if (stdoutData) proc.stdout.emit('data', Buffer.from(stdoutData));
    if (stderrData) proc.stderr.emit('data', Buffer.from(stderrData));
    proc.emit('close', exitCode);
  }, delayMs);

  return proc;
}

function makeHangingProcess() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };
  proc.kill = jest.fn(() => {
    setTimeout(() => proc.emit('close', null), 5);
  });
  return proc;
}

// ── Setup / teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  monitor.reset();
  spawnSpy = jest.spyOn(childProcess, 'spawn');
});

afterEach(() => {
  spawnSpy.mockRestore();
});

// ── Successful execution ───────────────────────────────────────────────────

describe('aiExecutionService — success', () => {
  it('parses JSON stdout and returns prediction', async () => {
    const payload = JSON.stringify({ success: true, prediction: 'apple', confidence: 0.95 });
    spawnSpy.mockReturnValue(makeProcess(payload, '', 0));

    const result = await executePythonScript({
      scriptPath: '/fake/classify.py',
      skipCircuit: true,
    });

    expect(result.success).toBe(true);
    expect(result.prediction).toBe('apple');
    expect(result.confidence).toBe(0.95);
  });

  it('returns plain text prediction when stdout is not JSON', async () => {
    spawnSpy.mockReturnValue(makeProcess('banana\n', '', 0));

    const result = await executePythonScript({
      scriptPath: '/fake/classify.py',
      skipCircuit: true,
    });

    expect(result.success).toBe(true);
    expect(result.prediction).toBe('banana');
  });
});

// ── Failure handling ───────────────────────────────────────────────────────

describe('aiExecutionService — failure', () => {
  it('returns success=false on non-zero exit code', async () => {
    spawnSpy.mockReturnValue(makeProcess('', 'Script error', 1));

    const result = await executePythonScript({
      scriptPath: '/fake/script.py',
      maxRetries: 0,
      skipCircuit: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error message on spawn error', async () => {
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.stdin = { write: jest.fn(), end: jest.fn() };
    proc.kill = jest.fn();
    setTimeout(() => proc.emit('error', new Error('python not found')), 10);

    spawnSpy.mockReturnValue(proc);

    const result = await executePythonScript({
      scriptPath: '/fake/script.py',
      maxRetries: 0,
      skipCircuit: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to start AI script/);
  });
});

// ── Timeout handling ───────────────────────────────────────────────────────

describe('aiExecutionService — timeout', () => {
  it('returns timedOut=true when script exceeds timeoutMs', async () => {
    const proc = makeHangingProcess();
    spawnSpy.mockReturnValue(proc);

    const result = await executePythonScript({
      scriptPath: '/fake/script.py',
      timeoutMs: 100,
      skipCircuit: true,
    });

    expect(result.timedOut).toBe(true);
    expect(result.success).toBe(false);
    expect(proc.kill).toHaveBeenCalledWith('SIGKILL');
  }, 5000);
});

// ── Retry logic ────────────────────────────────────────────────────────────

describe('aiExecutionService — retry', () => {
  it('retries on failure and succeeds on second attempt', async () => {
    const successPayload = JSON.stringify({ success: true, prediction: 'mango' });
    let callCount = 0;

    spawnSpy.mockImplementation(() => {
      callCount++;
      return callCount === 1
        ? makeProcess('', 'error', 1)
        : makeProcess(successPayload, '', 0);
    });

    const result = await executePythonScript({
      scriptPath: '/fake/script.py',
      maxRetries: 1,
      skipCircuit: true,
    });

    expect(result.success).toBe(true);
    expect(result.prediction).toBe('mango');
    expect(callCount).toBe(2);
  });

  it('does NOT retry on timeout', async () => {
    let callCount = 0;
    spawnSpy.mockImplementation(() => {
      callCount++;
      return makeHangingProcess();
    });

    await executePythonScript({
      scriptPath: '/fake/script.py',
      timeoutMs: 100,
      maxRetries: 2,
      skipCircuit: true,
    });

    expect(callCount).toBe(1);
  }, 5000);
});

// ── Circuit breaker ────────────────────────────────────────────────────────

describe('aiServiceMonitor — circuit breaker', () => {
  it('opens circuit after 5 consecutive failures', () => {
    for (let i = 0; i < 5; i++) monitor.recordCircuit('test_svc', false);
    expect(monitor.getCircuitState('test_svc')).toBe('open');
  });

  it('returns circuit_open error immediately when circuit is open', async () => {
    for (let i = 0; i < 5; i++) monitor.recordCircuit('blocked_svc', false);

    const result = await executePythonScript({
      scriptPath: '/fake/script.py',
      serviceName: 'blocked_svc',
    });

    expect(result.success).toBe(false);
    expect(result.warnings).toContain('circuit_open');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('closes circuit after success', () => {
    monitor.recordCircuit('recover_svc', true);
    expect(monitor.getCircuitState('recover_svc')).toBe('closed');
  });
});

// ── Monitor stats ──────────────────────────────────────────────────────────

describe('aiServiceMonitor — stats', () => {
  it('tracks call counts correctly', () => {
    monitor.record('img_cls', { success: true }, 120);
    monitor.record('img_cls', { success: true }, 80);
    monitor.record('img_cls', { success: false, error: 'oops' }, 30);

    const stats = monitor.getStats('img_cls');
    expect(stats.calls).toBe(3);
    expect(stats.successes).toBe(2);
    expect(stats.failures).toBe(1);
  });

  it('calculates success rate correctly', () => {
    monitor.record('rate_svc', { success: true }, 100);
    monitor.record('rate_svc', { success: false, error: 'x' }, 100);
    monitor.record('rate_svc', { success: false, error: 'x' }, 100);
    monitor.record('rate_svc', { success: true }, 100);

    const stats = monitor.getStats('rate_svc');
    expect(stats.successRate).toBe('50.0%');
  });

  it('tracks timeouts separately', () => {
    monitor.record('timeout_svc', { success: false, timedOut: true }, 30000);
    const stats = monitor.getStats('timeout_svc');
    expect(stats.timeouts).toBe(1);
    expect(stats.failures).toBe(1);
  });

  it('returns null for unknown service', () => {
    expect(monitor.getStats('nonexistent')).toBeNull();
  });

  it('returns stats for all services when no name given', () => {
    monitor.record('svc_a', { success: true }, 10);
    monitor.record('svc_b', { success: false, error: 'x' }, 10);
    const all = monitor.getStats();
    expect(all).toHaveProperty('svc_a');
    expect(all).toHaveProperty('svc_b');
  });
});

// ── Explainability ────────────────────────────────────────────────────────

describe('aiServiceMonitor — buildExplainability', () => {
  it('returns standard explainability block', () => {
    const result = { success: true, confidence: 0.88, warnings: [] };
    const explain = monitor.buildExplainability('img_cls', result, 250);

    expect(explain).toMatchObject({
      service: 'img_cls',
      durationMs: 250,
      fallbackUsed: false,
      timedOut: false,
      confidence: 0.88,
    });
    expect(explain.generatedAt).toBeTruthy();
  });

  it('marks fallbackUsed when result indicates fallback', () => {
    const result = { success: true, fallbackUsed: true };
    const explain = monitor.buildExplainability('rec_svc', result, 100);
    expect(explain.fallbackUsed).toBe(true);
  });
});
