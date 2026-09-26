const path = require('path');
const { expect } = require('chai');
const { executePythonScript } = require('../services/aiExecutionService');

describe('AI Execution Service', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  it('returns normalized success data from Python JSON output', async () => {
    const result = await executePythonScript({
      scriptPath: path.join(fixturesDir, 'ai_success.py')
    });

    expect(result.success).to.equal(true);
    expect(result.prediction).to.equal('apple_pie');
    expect(result.confidence).to.equal(0.98);
    expect(result.error).to.equal(null);
    expect(result.exitCode).to.equal(0);
  });

  it('writes stdin to the Python process and reads the normalized JSON response', async () => {
    const result = await executePythonScript({
      scriptPath: path.join(fixturesDir, 'ai_stdin_echo.py'),
      stdin: Buffer.from('hello-from-stdin')
    });

    expect(result.success).to.equal(true);
    expect(result.prediction).to.equal('hello-from-stdin');
    expect(result.confidence).to.equal(1);
    expect(result.error).to.equal(null);
    expect(result.exitCode).to.equal(0);
  });

  it('returns normalized failure data when the script exits with an error', async () => {
    const result = await executePythonScript({
      scriptPath: path.join(fixturesDir, 'ai_failure.py')
    });

    expect(result.success).to.equal(false);
    expect(result.prediction).to.equal(null);
    expect(result.error).to.equal('model failure');
    expect(result.exitCode).to.equal(1);
  });

  it('terminates long-running scripts when the timeout is reached', async () => {
    const result = await executePythonScript({
      scriptPath: path.join(fixturesDir, 'ai_timeout.py'),
      timeoutMs: 100
    });

    expect(result.success).to.equal(false);
    expect(result.timedOut).to.equal(true);
    expect(result.error).to.equal('AI script timed out after 100ms');
  });

  it('returns a backend-friendly error when the script path does not exist', async () => {
    const result = await executePythonScript({
      scriptPath: path.join(fixturesDir, 'does_not_exist.py')
    });

    expect(result.success).to.equal(false);
    expect(result.exitCode).to.not.equal(0);
    expect(result.error.toLowerCase()).to.contain('no such file');
  });
});
