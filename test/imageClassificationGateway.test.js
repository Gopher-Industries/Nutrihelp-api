/**
 * imageClassificationGateway.test.js
 *
 * Covers every branch of the image-classification pipeline that the
 * frontend contract depends on:
 *
 *   • AI success with high confidence           → source: 'ai', uncertain: false
 *   • AI success with low  confidence           → source: 'ai', uncertain: true,  label: null
 *   • AI failure → fallback success             → source: 'fallback', fallbackUsed: true
 *   • AI timeout → fallback success             → timedOut flag preserved
 *   • Circuit open → fallback success           → circuitOpen flag + warnings
 *   • AI failure AND fallback failure           → 503 AI_SERVICE_UNAVAILABLE
 *   • Empty image buffer                        → 400 IMAGE_EMPTY
 *
 * The gateway is driven with an injected runner so no Python process is
 * spawned during unit tests.
 */

const { expect } = require('chai');
const sinon = require('sinon');

const {
  parseRawLabel,
  buildClassification,
  DEFAULT_CONFIDENCE_THRESHOLD,
} = require('../services/imageClassificationContract');

const { createGateway } = require('../services/imageClassificationGateway');

function makeMonitor({ circuitOpen = false } = {}) {
  return {
    isCircuitOpen: sinon.stub().returns(circuitOpen),
    record: sinon.stub(),
    recordCircuit: sinon.stub(),
    buildExplainability: sinon.stub().returns({}),
  };
}

function imageBuffer() {
  return Buffer.from('fake-image-bytes');
}

describe('imageClassificationContract', () => {
  it('parses a raw "Label:~NN calories per 100 grams" string into label + calories', () => {
    const parsed = parseRawLabel('Apple Golden 1:~52 calories per 100 grams');
    expect(parsed.label).to.equal('Apple Golden 1');
    expect(parsed.calories).to.deep.equal({ value: 52, unit: 'kcal/100g' });
  });

  it('returns label with null calories when the annotation is missing', () => {
    const parsed = parseRawLabel('SomeFood');
    expect(parsed.label).to.equal('SomeFood');
    expect(parsed.calories).to.equal(null);
  });

  it('returns null label when input is empty', () => {
    expect(parseRawLabel(null).label).to.equal(null);
    expect(parseRawLabel('').label).to.equal(null);
  });

  it('flags confidence below threshold as uncertain and hides the label', () => {
    const c = buildClassification({
      rawLabel: 'Banana:~89 calories per 100 grams',
      confidence: 0.2,
      source: 'ai',
    });
    expect(c.uncertain).to.equal(true);
    expect(c.label).to.equal(null);
    expect(c.calories).to.equal(null);
    expect(c.rawLabel).to.equal('Banana:~89 calories per 100 grams');
    expect(c.confidence).to.equal(0.2);
  });

  it('surfaces high-confidence predictions as definitive answers', () => {
    const c = buildClassification({
      rawLabel: 'Banana:~89 calories per 100 grams',
      confidence: 0.92,
      source: 'ai',
    });
    expect(c.uncertain).to.equal(false);
    expect(c.label).to.equal('Banana');
    expect(c.calories).to.deep.equal({ value: 89, unit: 'kcal/100g' });
    expect(c.fallbackUsed).to.equal(false);
  });

  it('marks fallback-sourced predictions with fallbackUsed:true', () => {
    const c = buildClassification({
      rawLabel: 'Banana:~89 calories per 100 grams',
      confidence: 0.9,
      source: 'fallback',
    });
    expect(c.source).to.equal('fallback');
    expect(c.fallbackUsed).to.equal(true);
  });
});

describe('imageClassificationGateway', () => {
  it('returns 400 IMAGE_EMPTY when the buffer is empty', async () => {
    const runner = sinon.stub();
    const gw = createGateway({ runner, monitor: makeMonitor() });

    const res = await gw.classify(Buffer.alloc(0));

    expect(res.ok).to.equal(false);
    expect(res.httpStatus).to.equal(400);
    expect(res.code).to.equal('IMAGE_EMPTY');
    expect(runner.called).to.equal(false);
  });

  it('returns a normalised AI success response when the primary is confident', async () => {
    const runner = sinon.stub().resolves({
      success: true,
      prediction: 'Banana:~89 calories per 100 grams',
      confidence: 0.93,
      warnings: [],
      timedOut: false,
    });

    const gw = createGateway({ runner, monitor: makeMonitor() });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(true);
    expect(res.httpStatus).to.equal(200);
    expect(res.data.classification).to.include({
      label: 'Banana',
      rawLabel: 'Banana:~89 calories per 100 grams',
      uncertain: false,
      source: 'ai',
      fallbackUsed: false,
      confidence: 0.93,
    });
    expect(res.data.classification.calories).to.deep.equal({ value: 89, unit: 'kcal/100g' });
    expect(res.data.explainability).to.include({
      service: 'image_classification',
      source: 'ai',
      fallbackUsed: false,
      timedOut: false,
      circuitOpen: false,
      contractVersion: 'v1',
    });
    expect(runner.calledOnce).to.equal(true);
  });

  it('flags low-confidence AI predictions as uncertain without falling back', async () => {
    const runner = sinon.stub().resolves({
      success: true,
      prediction: 'Banana:~89 calories per 100 grams',
      confidence: 0.21,
      warnings: [],
      timedOut: false,
    });

    const gw = createGateway({ runner, monitor: makeMonitor() });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(true);
    expect(res.data.classification.uncertain).to.equal(true);
    expect(res.data.classification.label).to.equal(null);
    expect(res.data.classification.source).to.equal('ai');
    expect(res.data.classification.confidence).to.equal(0.21);
    expect(runner.calledOnce).to.equal(true);
  });

  it('routes to the fallback when the primary script fails', async () => {
    const runner = sinon.stub();
    runner.onFirstCall().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model crashed',
      warnings: [],
      timedOut: false,
    });
    runner.onSecondCall().resolves({
      success: true,
      prediction: 'Apple Red 1:~52 calories per 100 grams',
      confidence: 0.8,
      warnings: ['fallback_classifier'],
      timedOut: false,
    });

    const gw = createGateway({ runner, monitor: makeMonitor() });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(true);
    expect(res.data.classification.source).to.equal('fallback');
    expect(res.data.classification.fallbackUsed).to.equal(true);
    expect(res.data.classification.label).to.equal('Apple Red 1');
    expect(res.data.explainability.fallbackUsed).to.equal(true);
    expect(res.data.explainability.warnings).to.include('primary_failed');
    expect(runner.calledTwice).to.equal(true);
  });

  it('preserves the timedOut flag through a fallback recovery', async () => {
    const runner = sinon.stub();
    runner.onFirstCall().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'timeout',
      warnings: [],
      timedOut: true,
    });
    runner.onSecondCall().resolves({
      success: true,
      prediction: 'Pear:~57 calories per 100 grams',
      confidence: 0.7,
      warnings: ['fallback_classifier'],
      timedOut: false,
    });

    const gw = createGateway({ runner, monitor: makeMonitor() });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(true);
    expect(res.data.classification.source).to.equal('fallback');
    expect(res.data.explainability.timedOut).to.equal(true);
    expect(res.data.explainability.warnings).to.include('primary_timeout');
  });

  it('skips the primary entirely when the circuit is open', async () => {
    const runner = sinon.stub().resolves({
      success: true,
      prediction: 'Orange:~47 calories per 100 grams',
      confidence: 0.7,
      warnings: ['fallback_classifier'],
      timedOut: false,
    });

    const gw = createGateway({
      runner,
      monitor: makeMonitor({ circuitOpen: true }),
    });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(true);
    expect(res.data.classification.source).to.equal('fallback');
    expect(res.data.explainability.circuitOpen).to.equal(true);
    expect(res.data.explainability.warnings).to.include('circuit_open');
    expect(runner.calledOnce).to.equal(true); // only the fallback
  });

  it('returns 503 AI_SERVICE_UNAVAILABLE when both primary and fallback fail', async () => {
    const runner = sinon.stub();
    runner.onFirstCall().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'model crashed',
      warnings: [],
      timedOut: false,
    });
    runner.onSecondCall().resolves({
      success: false,
      prediction: null,
      confidence: null,
      error: 'fallback crashed',
      warnings: [],
      timedOut: false,
    });

    const gw = createGateway({ runner, monitor: makeMonitor() });
    const res = await gw.classify(imageBuffer());

    expect(res.ok).to.equal(false);
    expect(res.httpStatus).to.equal(503);
    expect(res.code).to.equal('AI_SERVICE_UNAVAILABLE');
    expect(res.meta.explainability.fallbackUsed).to.equal(true);
    expect(res.meta.explainability.warnings).to.include('fallback_failed');
  });

  it('honours a custom confidenceThreshold override', async () => {
    const runner = sinon.stub().resolves({
      success: true,
      prediction: 'Banana:~89 calories per 100 grams',
      confidence: 0.5,
      warnings: [],
      timedOut: false,
    });

    const gwStrict = createGateway({
      runner,
      monitor: makeMonitor(),
      confidenceThreshold: 0.9,
    });
    const resStrict = await gwStrict.classify(imageBuffer());
    expect(resStrict.data.classification.uncertain).to.equal(true);

    const gwLoose = createGateway({
      runner,
      monitor: makeMonitor(),
      confidenceThreshold: 0.1,
    });
    const resLoose = await gwLoose.classify(imageBuffer());
    expect(resLoose.data.classification.uncertain).to.equal(false);
  });

  it('exposes a sane default threshold', () => {
    expect(DEFAULT_CONFIDENCE_THRESHOLD).to.be.a('number');
    expect(DEFAULT_CONFIDENCE_THRESHOLD).to.be.greaterThan(0);
    expect(DEFAULT_CONFIDENCE_THRESHOLD).to.be.lessThan(1);
  });
});
