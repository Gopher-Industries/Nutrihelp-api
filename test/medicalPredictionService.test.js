const { expect } = require('chai');

const { ServiceError } = require('../services/serviceError');
const { MedicalPredictionService, encodeMedicalSurvey } = require('../services/medicalPredictionService');

describe('Medical prediction service', () => {
  it('encodes mixed survey inputs into the AI payload format', () => {
    const encoded = encodeMedicalSurvey({
      Gender: 'male',
      Age: '42',
      Height: '1.75',
      Weight: '82',
      family_history_with_overweight: 'Yes',
      FAVC: 'true',
      FCVC: '3',
      NCP: '4',
      CAEC: '2',
      SMOKE: 'no',
      CH2O: '2.5',
      SCC: false,
      FAF: '1',
      TUE: '4',
      CALC: '1',
      MTRANS: 'bus'
    });

    expect(encoded).to.deep.equal({
      Gender: 1,
      Age: 42,
      Height: 1.75,
      Weight: 82,
      family_history_with_overweight: 'yes',
      FAVC: 1,
      FCVC: 3,
      NCP: 4,
      CAEC: 2,
      SMOKE: 0,
      CH2O: 2.5,
      SCC: 'no',
      FAF: 1,
      TUE: 4,
      CALC: 1,
      MTRANS: 'Public_Transportation'
    });
  });

  it('returns normalized medical reports from AI responses', async () => {
    const service = new MedicalPredictionService();
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        medical_report: {
          bmi: 27.5,
          obesity_prediction: { obesity_level: 'Overweight' }
        }
      })
    });

    const result = await service.predict({ Gender: 'female' }, { fetch: fetchStub });

    expect(result).to.deep.equal({
      statusCode: 200,
      body: {
        survey_id: null,
        medical_report: {
          bmi: 27.5,
          obesity_prediction: { obesity_level: 'Overweight' }
        }
      }
    });
  });

  it('surfaces AI error payloads as service errors', async () => {
    const service = new MedicalPredictionService();
    const fetchStub = async () => ({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ detail: 'Bad payload' })
    });

    try {
      await service.predict({}, { fetch: fetchStub });
      throw new Error('Expected predict to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(422);
      expect(error.message).to.equal('AI retrieve error');
      expect(error.details).to.deep.equal({ detail: 'Bad payload' });
    }
  });
});
