/**
 * FE-06 AI assessment: feature mapping, output normalisation and gateway.
 * Runs offline; the AI model is always stubbed.
 */
const { expect } = require('chai');

const { toModelFeatures, waterBand, activityBand, screenBand } = require('../../services/aiAssessment/featureMapper');
const normaliser = require('../../services/aiAssessment/normaliser');
const { createGateway } = require('../../services/aiAssessment/gateway');
const { successDataSchema } = require('../../services/aiAssessment/schemas');
const { ServiceError } = require('../../services/serviceError');

const inputs = () => ({ ...require('../../contracts/ai-assessment/v1/fixtures/request-valid.json').inputs });
const THRESHOLDS = { confidence: 0.6, diabetesModerate: 0.3, diabetesHigh: 0.6 };

function fakeMonitor({ open = false } = {}) {
  const calls = { record: [], circuit: [] };
  return {
    calls,
    isCircuitOpen: () => open,
    record: (...args) => calls.record.push(args),
    recordCircuit: (...args) => calls.circuit.push(args),
  };
}

function gatewayWith(predict, extra = {}) {
  let t = 1000;
  return createGateway({
    predictionService: { predict },
    fetch: async () => ({}),
    now: () => (t += 50),
    thresholds: THRESHOLDS,
    timeoutMs: 40,
    ...extra,
  });
}

const assertContract = (data) => {
  const { error } = successDataSchema.validate(data, { abortEarly: false });
  expect(error, error && error.message).to.equal(undefined);
};

describe('FE-06 AI assessment gateway', () => {
  describe('feature mapper', () => {
    it('maps plain-unit inputs onto every model feature', () => {
      const f = toModelFeatures(inputs());
      expect(f).to.deep.equal({
        Gender: 'male', Age: 45, Height: 1.78, Weight: 92, family_history_with_overweight: 'yes',
        FAVC: 'yes', FCVC: 2, NCP: 3, CAEC: 'Frequently', SMOKE: 'no', CH2O: 2, SCC: 'no',
        FAF: 1, TUE: 1, CALC: 'Frequently', MTRANS: 'Automobile',
      });
    });

    it('bands water, activity and screen time at the agreed edges', () => {
      expect([0.9, 1, 2, 2.1].map(waterBand)).to.deep.equal([1, 2, 2, 3]);
      expect([0, 1, 2, 3, 4, 5, 7].map(activityBand)).to.deep.equal([0, 1, 1, 2, 2, 3, 3]);
      expect([0, 2, 3, 5, 6].map(screenBand)).to.deep.equal([0, 0, 1, 1, 2]);
    });
  });

  describe('normaliser', () => {
    it('reads confidence given as 0-1 or as a percentage', () => {
      expect(normaliser.toUnitInterval(0.798)).to.equal(0.798);
      expect(normaliser.toUnitInterval(79.8)).to.equal(0.798);
      expect(normaliser.toUnitInterval('85')).to.equal(0.85);
      [null, undefined, '', -1, 250, 'high'].forEach((v) => expect(normaliser.toUnitInterval(v), String(v)).to.equal(null));
    });

    it('reads the diabetes flag from booleans, numbers and sentences, and refuses to guess', () => {
      expect(normaliser.toPositive(true)).to.equal(true);
      expect(normaliser.toPositive(0)).to.equal(false);
      expect(normaliser.toPositive('Potential diabetes risk signal detected')).to.equal(true);
      expect(normaliser.toPositive('No diabetes risk signal detected')).to.equal(false);
      expect(normaliser.toPositive('not detected')).to.equal(false);
      expect(normaliser.toPositive('maybe')).to.equal(null);
      expect(normaliser.toPositive(undefined)).to.equal(null);
    });

    it('turns probability into a risk level only when a probability exists', () => {
      expect([0.1, 0.3, 0.59, 0.6].map((p) => normaliser.riskLevelFromProbability(p, THRESHOLDS)))
        .to.deep.equal(['low', 'moderate', 'moderate', 'high']);
      expect(normaliser.riskLevelFromProbability(null, THRESHOLDS)).to.equal(null);
    });

    it('accepts the report as an object or a one-item array', () => {
      const report = { obesity_prediction: { obesity_level: 'Normal_Weight' } };
      expect(normaliser.extractReport({ medical_report: report })).to.equal(report);
      expect(normaliser.extractReport({ data: { medical_report: [report] } })).to.equal(report);
      expect(normaliser.extractReport({ nothing: true })).to.equal(null);
    });

    it('normalises today\'s model output and flags disagreement with BMI', () => {
      const out = normaliser.normaliseModelPayload(
        { medical_report: { obesity_prediction: { obesity_level: 'Obesity_Type_I', confidence: 79.8 }, diabetes_prediction: { diabetes: 'true', confidence: 0.81 } } },
        inputs(),
        THRESHOLDS
      );
      expect(out.prediction.bmi).to.equal(29);
      expect(out.prediction.weightCategory).to.deep.equal({
        code: 'obese_1', label: 'Obesity class I', modelLabel: 'Obesity_Type_I', confidence: 0.798, agreesWithBmi: false,
      });
      expect(out.prediction.diabetes).to.deep.equal({ positive: true, riskLevel: null, probability: null, confidence: 0.81 });
      expect(out.prediction.uncertain).to.equal(false);
      expect(out.warnings).to.include.members(['model_disagrees_with_bmi', 'probability_unavailable']);
      expect(out.model).to.deep.equal({ name: 'nutrihelp-medical-report', version: 'unversioned' });
    });

    it('marks low confidence as uncertain and reads a model version when sent', () => {
      const out = normaliser.normaliseModelPayload(
        { model_version: 't2d-2026.11', medical_report: { obesity_prediction: { obesity_level: 'Overweight_Level_I', confidence: 0.4 }, diabetes_prediction: { probability: 0.72 } } },
        inputs(),
        THRESHOLDS
      );
      expect(out.prediction.uncertain).to.equal(true);
      expect(out.prediction.diabetes.riskLevel).to.equal('high');
      expect(out.warnings).to.include('low_confidence');
      expect(out.model.version).to.equal('t2d-2026.11');
    });

    it('drops an unreadable diabetes block instead of inventing one', () => {
      const out = normaliser.normaliseModelPayload(
        { medical_report: { obesity_prediction: { obesity_level: 'Overweight_Level_I', confidence: 0.9 }, diabetes_prediction: { diabetes: 'maybe' } } },
        inputs(),
        THRESHOLDS
      );
      expect(out.prediction.diabetes).to.equal(null);
      expect(out.warnings).to.include('diabetes_prediction_missing');
    });

    it('builds a BMI-only fallback with no diabetes estimate', () => {
      const fb = normaliser.buildFallbackPrediction(inputs());
      expect(fb).to.deep.include({ status: 'unavailable', source: 'fallback_estimate', uncertain: true, diabetes: null, bmi: 29 });
    });
  });

  describe('gateway', () => {
    const modelPayload = {
      body: { medical_report: { obesity_prediction: { obesity_level: 'Overweight_Level_II', confidence: 0.84 }, diabetes_prediction: { diabetes: true, confidence: 0.78 } } },
    };

    it('returns an AI prediction that matches the contract and records success', async () => {
      const monitor = fakeMonitor();
      let sent;
      const gateway = gatewayWith(async (features, options) => {
        sent = { features, options };
        return modelPayload;
      }, { monitor });
      const data = await gateway.predict(inputs(), { userId: 7 });

      assertContract(data);
      expect(data.prediction.source).to.equal('ai_model');
      expect(data.explainability).to.include({ fallbackUsed: false, timedOut: false, circuitOpen: false, contractVersion: 'v1' });
      expect(sent.features.MTRANS).to.equal('Automobile');
      expect(sent.options.fetch).to.be.a('function');
      expect(sent.features).to.not.have.any.keys('userId', 'user_id', 'email');
      expect(monitor.calls.circuit).to.deep.equal([['assessment_prediction', true]]);
    });

    it('serves the fallback when the model times out', async () => {
      const monitor = fakeMonitor();
      const gateway = gatewayWith(() => new Promise(() => {}), { monitor });
      const data = await gateway.predict(inputs());
      assertContract(data);
      expect(data.prediction.status).to.equal('unavailable');
      expect(data.explainability).to.include({ timedOut: true, fallbackUsed: true });
      expect(data.explainability.warnings).to.deep.equal(['model_timeout']);
      expect(monitor.calls.circuit).to.deep.equal([['assessment_prediction', false]]);
    });

    it('treats an aborted fetch as a timeout', async () => {
      const gateway = gatewayWith(async () => {
        throw new ServiceError(502, 'AI retrieve error', { detail: 'The operation was aborted due to timeout' });
      });
      expect((await gateway.predict(inputs())).explainability.warnings).to.deep.equal(['model_timeout']);
    });

    it('serves the fallback when the model is unreachable', async () => {
      const gateway = gatewayWith(async () => {
        throw new ServiceError(502, 'AI retrieve error', { detail: 'connect ECONNREFUSED' });
      });
      const data = await gateway.predict(inputs());
      assertContract(data);
      expect(data.explainability.warnings).to.deep.equal(['model_unreachable']);
      expect(data.explainability.timedOut).to.equal(false);
    });

    it('serves the fallback when the model answers with nothing usable', async () => {
      const data = await gatewayWith(async () => ({ body: { status: 'ok' } })).predict(inputs());
      assertContract(data);
      expect(data.explainability.warnings).to.deep.equal(['model_bad_response']);
    });

    it('skips the model entirely while the circuit is open', async () => {
      let called = false;
      const gateway = gatewayWith(async () => { called = true; }, { monitor: fakeMonitor({ open: true }) });
      const data = await gateway.predict(inputs());
      expect(called).to.equal(false);
      expect(data.explainability).to.include({ circuitOpen: true, fallbackUsed: true });
      assertContract(data);
    });
  });
});
