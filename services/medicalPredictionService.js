const { ServiceError } = require('./serviceError');
const { fetchJson } = require('./httpClientService');

const AI_RETRIEVE_URL =
  process.env.AI_RETRIEVE_URL ||
  'http://localhost:8000/ai-model/medical-report/retrieve';

const lower = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

const toYesNoStr = (value) => {
  const normalized = lower(value);
  if (['yes', 'y', 'true', '1', 1, true].includes(normalized)) return 'yes';
  if (['no', 'n', 'false', '0', 0, false].includes(normalized)) return 'no';
  return undefined;
};

const to01Int = (value) => {
  const normalized = lower(value);
  if (['yes', 'y', 'true', '1', 1, true].includes(normalized)) return 1;
  if (['no', 'n', 'false', '0', 0, false].includes(normalized)) return 0;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric > 1) return 1;
    if (numeric === 0) return 0;
  }
  return undefined;
};

const normalizeGender = (value) => {
  const normalized = lower(value);
  if (normalized === 'male' || normalized === 'm' || value === 1 || value === '1') return 1;
  if (normalized === 'female' || normalized === 'f' || value === 2 || value === '2') return 2;
  return undefined;
};

const normalizeEnum = (value, max) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= max ? numeric : undefined;
};

const ALLOWED_MTRANS = new Set([
  'Walking',
  'Bike',
  'Public_Transportation',
  'Automobile',
  'Motorbike'
]);

const normalizeMTRANS = (value) => {
  if (value == null) return undefined;
  const normalized = String(value).trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ');
  if (normalized === 'walking' || normalized === 'walk') return 'Walking';
  if (normalized === 'bike' || normalized === 'bicycle') return 'Bike';
  if (
    normalized === 'public transportation' ||
    normalized === 'public_transportation' ||
    normalized === 'public' ||
    normalized === 'bus' ||
    normalized === 'train'
  ) {
    return 'Public_Transportation';
  }
  if (normalized === 'automobile' || normalized === 'car') return 'Automobile';
  if (normalized === 'motorbike' || normalized === 'motorcycle') return 'Motorbike';
  return ALLOWED_MTRANS.has(value) ? value : undefined;
};

function encodeMedicalSurvey(input) {
  return {
    Gender: normalizeGender(input.Gender),
    Age: Number(input.Age),
    Height: Number(input.Height),
    Weight: Number(input.Weight),
    family_history_with_overweight: toYesNoStr(input.family_history_with_overweight),
    FAVC: to01Int(input.FAVC),
    FCVC: Number(input.FCVC),
    NCP: Number(input.NCP),
    CAEC: normalizeEnum(input.CAEC, 3),
    SMOKE: to01Int(input.SMOKE),
    CH2O: Number(input.CH2O),
    SCC: toYesNoStr(input.SCC),
    FAF: Number(input.FAF),
    TUE: Number(input.TUE),
    CALC: normalizeEnum(input.CALC, 2),
    MTRANS: normalizeMTRANS(input.MTRANS)
  };
}

class MedicalPredictionService {
  async predict(userInput, options = {}) {
    const encoded = encodeMedicalSurvey(userInput || {});
    const { ok, status, data } = await fetchJson(
      AI_RETRIEVE_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encoded)
      },
      options.fetch
    );

    if (!ok) {
      throw new ServiceError(status, 'AI retrieve error', {
        detail: typeof data === 'string' ? data : data?.detail || data
      });
    }

    if (!data || !data.medical_report) {
      throw new ServiceError(400, 'AI server returned no medical_report', {
        message: data
      });
    }

    return {
      statusCode: 200,
      body: {
        survey_id: null,
        medical_report: data.medical_report
      }
    };
  }
}

module.exports = {
  MedicalPredictionService,
  medicalPredictionService: new MedicalPredictionService(),
  encodeMedicalSurvey
};
