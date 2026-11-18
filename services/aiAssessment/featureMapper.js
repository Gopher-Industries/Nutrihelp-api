'use strict';

/**
 * Maps contract inputs (plain units) to the features the deployed NutriHelp
 * medical-report model expects (FE-06).
 *
 * This is the ONLY place that knows the model's feature names and encodings.
 * When the AI team changes the model (for example Rashid's Type 2 Diabetes
 * model), this file and the normaliser change; the screen and the contract do
 * not.
 *
 * The output uses the survey format MedicalPredictionService.encodeMedicalSurvey
 * already accepts on the live /retrieve path, so this reuses what works in
 * production today. Encodings marked "confirm" are open questions in the
 * contract doc: the OpenAPI spec and the code disagree on them.
 */

const FREQUENCY_TO_MODEL = {
  never: 'no',
  sometimes: 'Sometimes',
  frequently: 'Frequently',
  always: 'Always',
};

const VEGETABLES_TO_FCVC = { rarely: 1, sometimes: 2, always: 3 };

const TRANSPORT_TO_MTRANS = {
  car: 'Automobile',
  public_transport: 'Public_Transportation',
  motorbike: 'Motorbike',
  bicycle: 'Bike',
  walking: 'Walking',
};

const yesNo = (value) => (value ? 'yes' : 'no');

/** Daily water in litres to the model's 1 to 3 band. */
function waterBand(litres) {
  if (litres < 1) return 1;
  if (litres <= 2) return 2;
  return 3;
}

/** Active days a week to the model's 0 to 3 activity band (FAF). */
function activityBand(days) {
  if (days <= 0) return 0;
  if (days <= 2) return 1;
  if (days <= 4) return 2;
  return 3;
}

/** Recreational screen hours a day to the model's 0 to 2 band (TUE). */
function screenBand(hours) {
  if (hours <= 2) return 0;
  if (hours <= 5) return 1;
  return 2;
}

/**
 * @param {object} inputs  validated contract inputs
 * @returns {object}       feature payload for the medical-report model
 */
function toModelFeatures(inputs) {
  return {
    Gender: inputs.sex,
    Age: inputs.ageYears,
    Height: Number((inputs.heightCm / 100).toFixed(3)),
    Weight: inputs.weightKg,
    family_history_with_overweight: yesNo(inputs.familyHistoryOverweight),
    FAVC: yesNo(inputs.highCalorieFoods),
    FCVC: VEGETABLES_TO_FCVC[inputs.vegetableFrequency],
    NCP: inputs.mainMealsPerDay,
    CAEC: FREQUENCY_TO_MODEL[inputs.snackingFrequency], // confirm: string or 0-3 integer
    SMOKE: yesNo(inputs.smoker),
    CH2O: waterBand(inputs.waterLitresPerDay),
    SCC: yesNo(inputs.monitorsCalories),
    FAF: activityBand(inputs.activityDaysPerWeek),
    TUE: screenBand(inputs.screenTimeHoursPerDay),
    CALC: FREQUENCY_TO_MODEL[inputs.alcoholFrequency], // confirm: string or 0-3 integer
    MTRANS: TRANSPORT_TO_MTRANS[inputs.transport],
  };
}

module.exports = { toModelFeatures, waterBand, activityBand, screenBand };
