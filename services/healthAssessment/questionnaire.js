'use strict';

/**
 * AI Health Assessment questionnaire definition (FE-04).
 *
 * This is the single source of truth for the assessment. The frontend renders
 * its wizard from GET /api/health-assessment/questions, and the validator and
 * scoring engine read the same definition, so a question added here appears in
 * the UI, is validated and is scored without touching three places.
 *
 * Several questions deliberately mirror the features of the obesity / diabetes
 * model served by the NutriHelp AI service (UCI "Estimation of obesity levels
 * based on eating habits and physical condition"). `aiKey` records which model
 * feature a question feeds so the payload for /ai-model/medical-report can be
 * built mechanically (see toAiSurvey below).
 *
 * No question accepts free text. That is intentional: answers flow into an LLM
 * prompt for the narrative summary, and closed answers remove the prompt
 * injection surface entirely.
 */

const QUESTIONNAIRE_VERSION = '1.0.0';

const SECTIONS = [
  {
    id: 'body',
    title: 'About you',
    description: 'Your body measurements let us calculate BMI, energy needs and healthy ranges.',
    icon: 'user',
    questions: [
      {
        id: 'gender',
        label: 'Sex',
        help: 'Used for metabolic-rate and waist-risk formulas, which differ by biological sex.',
        type: 'single',
        required: true,
        aiKey: 'Gender',
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
        ],
      },
      {
        id: 'age',
        label: 'Age',
        type: 'number',
        unit: 'years',
        required: true,
        min: 16,
        max: 100,
        step: 1,
        aiKey: 'Age',
      },
      {
        id: 'heightCm',
        label: 'Height',
        type: 'number',
        unit: 'cm',
        required: true,
        min: 120,
        max: 230,
        step: 0.5,
      },
      {
        id: 'weightKg',
        label: 'Weight',
        type: 'number',
        unit: 'kg',
        required: true,
        min: 30,
        max: 300,
        step: 0.1,
        aiKey: 'Weight',
      },
      {
        id: 'waistCm',
        label: 'Waist circumference',
        help: 'Measure around your waist at the level of your navel. Improves diabetes and heart risk accuracy.',
        type: 'number',
        unit: 'cm',
        required: false,
        min: 40,
        max: 200,
        step: 0.5,
      },
    ],
  },
  {
    id: 'eating',
    title: 'Eating habits',
    description: 'How and what you eat day to day.',
    icon: 'utensils',
    questions: [
      {
        id: 'vegetableFrequency',
        label: 'How often do you eat vegetables with your meals?',
        type: 'single',
        required: true,
        aiKey: 'FCVC',
        options: [
          { value: 1, label: 'Rarely' },
          { value: 2, label: 'Sometimes' },
          { value: 3, label: 'With most meals' },
        ],
      },
      {
        id: 'mainMeals',
        label: 'How many main meals do you have a day?',
        type: 'single',
        required: true,
        aiKey: 'NCP',
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
          { value: 3, label: 'Three' },
          { value: 4, label: 'More than three' },
        ],
      },
      {
        id: 'snacking',
        label: 'How often do you eat between meals?',
        type: 'single',
        required: true,
        aiKey: 'CAEC',
        options: [
          { value: 'no', label: 'Never' },
          { value: 'Sometimes', label: 'Sometimes' },
          { value: 'Frequently', label: 'Frequently' },
          { value: 'Always', label: 'Always' },
        ],
      },
      {
        id: 'highCalorieFoods',
        label: 'Do you often eat high-calorie foods (fast food, sweets, fried food)?',
        type: 'boolean',
        required: true,
        aiKey: 'FAVC',
      },
      {
        id: 'waterIntake',
        label: 'How much water do you drink a day?',
        type: 'single',
        required: true,
        aiKey: 'CH2O',
        options: [
          { value: 1, label: 'Less than 1 litre' },
          { value: 2, label: '1 to 2 litres' },
          { value: 3, label: 'More than 2 litres' },
        ],
      },
      {
        id: 'monitorsCalories',
        label: 'Do you keep track of the calories you eat?',
        type: 'boolean',
        required: true,
        aiKey: 'SCC',
      },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle',
    description: 'Daily habits that shape long-term health.',
    icon: 'moon',
    questions: [
      {
        id: 'sleepHours',
        label: 'On average, how many hours do you sleep a night?',
        type: 'number',
        unit: 'hours',
        required: true,
        min: 3,
        max: 14,
        step: 0.5,
      },
      {
        id: 'stressLevel',
        label: 'How would you rate your usual stress level?',
        type: 'scale',
        required: true,
        min: 1,
        max: 5,
        minLabel: 'Very low',
        maxLabel: 'Very high',
      },
      {
        id: 'smoker',
        label: 'Do you smoke or vape?',
        type: 'boolean',
        required: true,
        aiKey: 'SMOKE',
      },
      {
        id: 'alcohol',
        label: 'How often do you drink alcohol?',
        type: 'single',
        required: true,
        aiKey: 'CALC',
        options: [
          { value: 'no', label: 'Never' },
          { value: 'Sometimes', label: 'Sometimes' },
          { value: 'Frequently', label: 'Frequently' },
          { value: 'Always', label: 'Daily' },
        ],
      },
      {
        id: 'screenTime',
        label: 'Recreational screen time per day',
        type: 'single',
        required: true,
        aiKey: 'TUE',
        options: [
          { value: 0, label: '0 to 2 hours' },
          { value: 1, label: '3 to 5 hours' },
          { value: 2, label: 'More than 5 hours' },
        ],
      },
    ],
  },
  {
    id: 'activity',
    title: 'Activity & history',
    description: 'Movement and family history are strong predictors of metabolic risk.',
    icon: 'activity',
    questions: [
      {
        id: 'activityFrequency',
        label: 'How often do you do physical activity (30+ minutes)?',
        type: 'single',
        required: true,
        aiKey: 'FAF',
        options: [
          { value: 0, label: 'I don\'t' },
          { value: 1, label: '1 to 2 days a week' },
          { value: 2, label: '2 to 4 days a week' },
          { value: 3, label: '4 or more days a week' },
        ],
      },
      {
        id: 'transport',
        label: 'How do you usually get around?',
        type: 'single',
        required: true,
        aiKey: 'MTRANS',
        options: [
          { value: 'Automobile', label: 'Car' },
          { value: 'Public_Transportation', label: 'Public transport' },
          { value: 'Motorbike', label: 'Motorbike' },
          { value: 'Bike', label: 'Bicycle' },
          { value: 'Walking', label: 'Walking' },
        ],
      },
      {
        id: 'familyHistoryOverweight',
        label: 'Has a close family member been overweight?',
        type: 'boolean',
        required: true,
        aiKey: 'family_history_with_overweight',
      },
      {
        id: 'familyHistoryDiabetes',
        label: 'Has a parent or sibling been diagnosed with type 1 or type 2 diabetes?',
        type: 'boolean',
        required: true,
      },
      {
        id: 'highBloodGlucose',
        label: 'Have you ever been told your blood glucose was high?',
        help: 'For example during a health check, illness or pregnancy.',
        type: 'boolean',
        required: true,
      },
      {
        id: 'bloodPressureMedication',
        label: 'Are you currently taking medication for high blood pressure?',
        type: 'boolean',
        required: true,
      },
    ],
  },
  {
    id: 'goals',
    title: 'Your goals',
    description: 'We tailor your targets and recommendations to what you want to achieve.',
    icon: 'target',
    questions: [
      {
        id: 'primaryGoal',
        label: 'What is your main goal?',
        type: 'single',
        required: true,
        options: [
          { value: 'lose_weight', label: 'Lose weight' },
          { value: 'maintain', label: 'Maintain a healthy weight' },
          { value: 'build_muscle', label: 'Build muscle' },
          { value: 'improve_energy', label: 'Improve energy and wellbeing' },
          { value: 'manage_condition', label: 'Manage a health condition' },
        ],
      },
      {
        id: 'targetWeightKg',
        label: 'Target weight',
        type: 'number',
        unit: 'kg',
        required: false,
        min: 30,
        max: 300,
        step: 0.1,
      },
      {
        id: 'daysPerWeek',
        label: 'How many days a week could you commit to exercise?',
        type: 'number',
        unit: 'days',
        required: true,
        min: 0,
        max: 7,
        step: 1,
      },
      {
        id: 'workoutPlace',
        label: 'Where would you prefer to exercise?',
        type: 'single',
        required: true,
        options: [
          { value: 'home', label: 'At home' },
          { value: 'gym', label: 'At a gym' },
        ],
      },
    ],
  },
];

const QUESTIONS = SECTIONS.flatMap((section) =>
  section.questions.map((question) => ({ ...question, sectionId: section.id }))
);

const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

function getQuestionnaire() {
  return {
    version: QUESTIONNAIRE_VERSION,
    estimatedMinutes: 4,
    sections: SECTIONS,
    disclaimer:
      'This assessment is a wellbeing screening tool, not a medical diagnosis. ' +
      'Talk to your GP or an accredited practising dietitian before making major changes, ' +
      'especially if you have a health condition.',
  };
}

const yesNo = (value) => (value ? 'yes' : 'no');

/**
 * Map validated answers onto the feature names used by the NutriHelp AI
 * medical-report model. Height is sent in metres, as the model expects.
 */
function toAiSurvey(answers) {
  return {
    Gender: answers.gender,
    Age: answers.age,
    Height: Number((answers.heightCm / 100).toFixed(3)),
    Weight: answers.weightKg,
    family_history_with_overweight: yesNo(answers.familyHistoryOverweight),
    FAVC: yesNo(answers.highCalorieFoods),
    FCVC: answers.vegetableFrequency,
    NCP: answers.mainMeals,
    CAEC: answers.snacking,
    SMOKE: yesNo(answers.smoker),
    CH2O: answers.waterIntake,
    SCC: yesNo(answers.monitorsCalories),
    FAF: answers.activityFrequency,
    TUE: answers.screenTime,
    CALC: answers.alcohol,
    MTRANS: answers.transport,
  };
}

/**
 * Payload accepted by POST /api/medical-report/plan, so the frontend can chain
 * "generate my weekly plan" straight from an assessment result.
 */
function toPlanSurvey(answers) {
  const survey = {
    Gender: answers.gender === 'male' ? 'Male' : 'Female',
    Age: answers.age,
    Height: Number((answers.heightCm / 100).toFixed(3)),
    Weight: answers.weightKg,
    days_per_week: answers.daysPerWeek,
    workout_place: answers.workoutPlace,
  };
  if (answers.targetWeightKg) survey.target_weight = answers.targetWeightKg;
  return survey;
}

module.exports = {
  QUESTIONNAIRE_VERSION,
  SECTIONS,
  QUESTIONS,
  QUESTION_BY_ID,
  getQuestionnaire,
  toAiSurvey,
  toPlanSurvey,
};
