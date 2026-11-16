'use strict';

/**
 * AI Health Assessment scoring engine (FE-04).
 *
 * Pure, deterministic and side-effect free: the same answers always produce the
 * same result, which makes every number on the results screen explainable and
 * unit-testable. The AI model's predictions are layered on top of this result
 * by healthAssessmentService; they never replace it, so the assessment still
 * works when the AI service is down.
 *
 * Clinical references for the formulas used:
 *   - BMI bands: WHO adult classification.
 *   - Waist risk: WHO / NHMRC thresholds (men 94 / 102 cm, women 80 / 88 cm).
 *   - Resting energy: Mifflin-St Jeor equation (1990).
 *   - Activity factors: standard PAL multipliers 1.2 to 1.725.
 *   - Diabetes risk: points adapted from AUSDRISK, the Australian type 2
 *     diabetes risk tool. Ethnicity / country-of-birth items are not asked, so
 *     the score is a screening estimate only and is labelled as such.
 *   - Hydration: ~35 ml per kg body weight, clamped to 1.5 to 4 litres.
 *   - Protein: 0.8 g/kg baseline, higher for older adults, weight loss and
 *     muscle gain (NRV Australia / ESPEN older adult guidance).
 */

const ENGINE_VERSION = '1.0.0';

const DOMAIN_WEIGHTS = {
  body: 0.2,
  nutrition: 0.2,
  activity: 0.2,
  metabolic: 0.15,
  lifestyle: 0.15,
  hydration: 0.1,
};

const DOMAIN_LABELS = {
  body: 'Body composition',
  nutrition: 'Nutrition',
  activity: 'Physical activity',
  metabolic: 'Metabolic health',
  lifestyle: 'Lifestyle',
  hydration: 'Hydration',
};

const WATER_LITRES_BY_ANSWER = { 1: 0.8, 2: 1.5, 3: 2.3 };
const ACTIVITY_FACTOR = { 0: 1.2, 1: 1.375, 2: 1.55, 3: 1.725 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, dp = 0) => {
  const factor = 10 ** dp;
  return Math.round(value * factor) / factor;
};

// ---------------------------------------------------------------------------
// Body metrics
// ---------------------------------------------------------------------------

function classifyBmi(bmi) {
  if (bmi < 18.5) return { key: 'underweight', label: 'Underweight' };
  if (bmi < 25) return { key: 'healthy', label: 'Healthy weight' };
  if (bmi < 30) return { key: 'overweight', label: 'Overweight' };
  if (bmi < 35) return { key: 'obese_1', label: 'Obesity class I' };
  if (bmi < 40) return { key: 'obese_2', label: 'Obesity class II' };
  return { key: 'obese_3', label: 'Obesity class III' };
}

function classifyWaist(waistCm, gender) {
  if (!waistCm) return null;
  const [increased, high] = gender === 'male' ? [94, 102] : [80, 88];
  if (waistCm >= high) return { key: 'high', label: 'Substantially increased risk', threshold: high };
  if (waistCm >= increased) return { key: 'increased', label: 'Increased risk', threshold: increased };
  return { key: 'low', label: 'Low risk', threshold: increased };
}

function computeBodyMetrics(answers) {
  const heightM = answers.heightCm / 100;
  const bmi = answers.weightKg / (heightM * heightM);
  const healthyMin = 18.5 * heightM * heightM;
  const healthyMax = 24.9 * heightM * heightM;

  return {
    bmi: round(bmi, 1),
    bmiCategory: classifyBmi(bmi),
    healthyWeightRangeKg: { min: round(healthyMin, 1), max: round(healthyMax, 1) },
    waist: classifyWaist(answers.waistCm, answers.gender),
    waistToHeightRatio: answers.waistCm ? round(answers.waistCm / answers.heightCm, 2) : null,
  };
}

// ---------------------------------------------------------------------------
// Energy and nutrition targets
// ---------------------------------------------------------------------------

function computeTargets(answers, body) {
  const { weightKg, heightCm, age, gender, primaryGoal, activityFrequency } = answers;

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTOR[activityFrequency] ?? 1.2);

  let calories = tdee;
  let calorieStrategy = 'Maintenance';
  const wantsLoss =
    primaryGoal === 'lose_weight' ||
    (primaryGoal === 'manage_condition' && body.bmi >= 25);

  if (wantsLoss && body.bmi > 20) {
    calories = tdee - 500;
    calorieStrategy = 'Moderate deficit (about 0.5 kg a week)';
  } else if (primaryGoal === 'build_muscle') {
    calories = tdee + 250;
    calorieStrategy = 'Lean surplus to support muscle gain';
  } else if (body.bmiCategory.key === 'underweight') {
    calories = tdee + 300;
    calorieStrategy = 'Gentle surplus to restore a healthy weight';
  }

  const floor = gender === 'male' ? 1500 : 1200;
  calories = Math.max(calories, floor, bmr);

  let proteinPerKg = 0.8;
  if (age >= 65) proteinPerKg = 1.2;
  if (wantsLoss) proteinPerKg = Math.max(proteinPerKg, 1.2);
  if (primaryGoal === 'build_muscle') proteinPerKg = 1.6;

  // Protein is dosed on a healthy reference weight for people with obesity so
  // the target is not inflated by excess body fat.
  const referenceWeight = body.bmi >= 30 ? body.healthyWeightRangeKg.max : weightKg;

  const waterTarget = clamp((weightKg * 35) / 1000, 1.5, 4);
  const waterCurrent = WATER_LITRES_BY_ANSWER[answers.waterIntake] ?? 1.5;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories / 10) * 10,
    calorieStrategy,
    proteinGrams: Math.round(referenceWeight * proteinPerKg),
    fibreGrams: gender === 'male' ? 30 : 25,
    waterLitres: round(waterTarget, 1),
    waterCurrentLitres: waterCurrent,
    activityMinutesPerWeek: 150,
  };
}

// ---------------------------------------------------------------------------
// Diabetes risk (AUSDRISK-adapted)
// ---------------------------------------------------------------------------

function computeDiabetesRisk(answers, body) {
  const factors = [];
  const add = (points, label) => {
    if (points > 0) factors.push({ label, points });
    return points;
  };

  let score = 0;
  const { age } = answers;
  const agePoints = age >= 65 ? 8 : age >= 55 ? 6 : age >= 45 ? 4 : age >= 35 ? 2 : 0;
  score += add(agePoints, `Age ${age}`);
  score += add(answers.gender === 'male' ? 3 : 0, 'Male sex');
  score += add(answers.familyHistoryDiabetes ? 3 : 0, 'Family history of diabetes');
  score += add(answers.highBloodGlucose ? 6 : 0, 'Previous high blood glucose');
  score += add(answers.bloodPressureMedication ? 2 : 0, 'Blood pressure medication');
  score += add(answers.smoker ? 2 : 0, 'Smoking');
  score += add(answers.vegetableFrequency < 3 ? 1 : 0, 'Vegetables not eaten daily');
  score += add(answers.activityFrequency < 2 ? 2 : 0, 'Less than 150 minutes of activity a week');

  let waistEstimated = false;
  let waistPoints;
  if (answers.waistCm) {
    const [mid, high] = answers.gender === 'male' ? [102, 110] : [88, 100];
    waistPoints = answers.waistCm > high ? 7 : answers.waistCm >= mid ? 4 : 0;
    score += add(waistPoints, `Waist ${answers.waistCm} cm`);
  } else {
    waistEstimated = true;
    waistPoints = body.bmi >= 35 ? 7 : body.bmi >= 30 ? 4 : 0;
    score += add(waistPoints, `BMI ${body.bmi} (used in place of waist)`);
  }

  let level;
  if (score >= 12) level = { key: 'high', label: 'High' };
  else if (score >= 6) level = { key: 'intermediate', label: 'Intermediate' };
  else level = { key: 'low', label: 'Low' };

  return {
    score,
    maxScore: 35,
    level,
    factors: factors.sort((a, b) => b.points - a.points),
    waistEstimated,
    method: 'Adapted from AUSDRISK (screening estimate)',
  };
}

// ---------------------------------------------------------------------------
// Domain scores, each 0-100 where 100 is best
// ---------------------------------------------------------------------------

function scoreBody(body) {
  const { bmi } = body;
  let score;
  if (bmi >= 18.5 && bmi < 25) score = 100;
  else if (bmi < 18.5) score = clamp(100 - (18.5 - bmi) * 15, 20, 100);
  else score = clamp(100 - (bmi - 24.9) * 5, 10, 100);

  if (body.waist?.key === 'increased') score -= 10;
  if (body.waist?.key === 'high') score -= 20;
  return clamp(score, 0, 100);
}

function scoreNutrition(answers) {
  const veg = { 1: 20, 2: 60, 3: 100 }[answers.vegetableFrequency];
  const snacking = { no: 100, Sometimes: 80, Frequently: 45, Always: 20 }[answers.snacking];
  const meals = { 1: 45, 2: 70, 3: 100, 4: 80 }[answers.mainMeals];
  const highCalorie = answers.highCalorieFoods ? 35 : 100;
  const monitoring = answers.monitorsCalories ? 100 : 70;

  return veg * 0.35 + snacking * 0.2 + highCalorie * 0.2 + meals * 0.15 + monitoring * 0.1;
}

function scoreActivity(answers) {
  const activity = { 0: 10, 1: 45, 2: 80, 3: 100 }[answers.activityFrequency];
  const transport = { Walking: 100, Bike: 100, Public_Transportation: 70, Motorbike: 40, Automobile: 35 }[
    answers.transport
  ];
  const screen = { 0: 100, 1: 65, 2: 30 }[answers.screenTime];
  return activity * 0.65 + transport * 0.15 + screen * 0.2;
}

function scoreHydration(targets) {
  return clamp((targets.waterCurrentLitres / targets.waterLitres) * 100, 15, 100);
}

function scoreLifestyle(answers) {
  const { sleepHours } = answers;
  let sleep;
  if (sleepHours >= 7 && sleepHours <= 9) sleep = 100;
  else if (sleepHours >= 6 && sleepHours <= 10) sleep = 70;
  else sleep = 35;

  const smoking = answers.smoker ? 0 : 100;
  const alcohol = { no: 100, Sometimes: 85, Frequently: 45, Always: 15 }[answers.alcohol];
  const stress = { 1: 100, 2: 85, 3: 65, 4: 40, 5: 20 }[answers.stressLevel];

  return smoking * 0.35 + sleep * 0.25 + alcohol * 0.2 + stress * 0.2;
}

function scoreMetabolic(diabetesRisk, answers) {
  let score = 100 - (diabetesRisk.score / 20) * 100;
  if (answers.bloodPressureMedication) score -= 5;
  return clamp(score, 5, 100);
}

function band(score) {
  if (score >= 85) return { key: 'excellent', label: 'Excellent' };
  if (score >= 70) return { key: 'good', label: 'Good' };
  if (score >= 55) return { key: 'fair', label: 'Fair' };
  if (score >= 40) return { key: 'attention', label: 'Needs attention' };
  return { key: 'priority', label: 'High priority' };
}

// ---------------------------------------------------------------------------
// Risk flags
// ---------------------------------------------------------------------------

function buildRiskFlags(answers, body, diabetesRisk, targets) {
  const flags = [];
  const flag = (id, severity, domain, title, detail) =>
    flags.push({ id, severity, domain, title, detail });

  const bmiKey = body.bmiCategory.key;
  if (bmiKey.startsWith('obese')) {
    flag('bmi_obese', bmiKey === 'obese_1' ? 'moderate' : 'high', 'body', `BMI ${body.bmi}: ${body.bmiCategory.label}`,
      'Carrying excess weight raises the risk of type 2 diabetes, heart disease and joint problems.');
  } else if (bmiKey === 'overweight') {
    flag('bmi_overweight', 'low', 'body', `BMI ${body.bmi}: Overweight`,
      `A healthy weight for your height is ${body.healthyWeightRangeKg.min} to ${body.healthyWeightRangeKg.max} kg.`);
  } else if (bmiKey === 'underweight') {
    flag('bmi_underweight', 'moderate', 'body', `BMI ${body.bmi}: Underweight`,
      'Low body weight can affect immunity, bone density and energy levels.');
  }

  if (body.waist && body.waist.key !== 'low') {
    flag('waist', body.waist.key === 'high' ? 'high' : 'moderate', 'body', `Waist ${answers.waistCm} cm`,
      'Fat stored around the abdomen is closely linked to heart disease and insulin resistance.');
  }

  if (diabetesRisk.level.key === 'high') {
    flag('diabetes_high', 'high', 'metabolic', 'High type 2 diabetes risk',
      'Your answers indicate a high screening risk. A blood test with your GP is strongly recommended.');
  } else if (diabetesRisk.level.key === 'intermediate') {
    flag('diabetes_intermediate', 'moderate', 'metabolic', 'Intermediate type 2 diabetes risk',
      'Lifestyle changes now can substantially lower this risk.');
  }

  if (answers.smoker) {
    flag('smoking', 'high', 'lifestyle', 'Smoking or vaping',
      'Smoking is the single largest preventable cause of disease. Free support is available through Quitline (13 78 48).');
  }
  if (answers.alcohol === 'Always' || answers.alcohol === 'Frequently') {
    flag('alcohol', answers.alcohol === 'Always' ? 'high' : 'moderate', 'lifestyle', 'Frequent alcohol use',
      'Australian guidelines recommend no more than 10 standard drinks a week and no more than 4 on any one day.');
  }
  if (answers.activityFrequency === 0) {
    flag('inactive', 'moderate', 'activity', 'Physically inactive',
      'Aim for at least 150 minutes of moderate activity spread across the week.');
  }
  if (answers.sleepHours < 6) {
    flag('sleep', 'moderate', 'lifestyle', 'Short sleep',
      'Regularly sleeping under 6 hours affects appetite hormones, mood and blood glucose control.');
  }
  if (answers.stressLevel >= 4) {
    flag('stress', 'low', 'lifestyle', 'High stress',
      'Ongoing stress can drive emotional eating and poor sleep.');
  }
  if (targets.waterCurrentLitres < targets.waterLitres * 0.6) {
    flag('hydration', 'low', 'hydration', 'Low fluid intake',
      `You are drinking roughly ${targets.waterCurrentLitres} L against a target of ${targets.waterLitres} L.`);
  }

  const order = { high: 0, moderate: 1, low: 2 };
  return flags.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function buildRecommendations(answers, body, diabetesRisk, targets, domainScores) {
  const recs = [];
  const rec = (id, domain, priority, title, rationale, actions) =>
    recs.push({ id, domain, priority, title, rationale, actions });

  if (diabetesRisk.level.key === 'high' || answers.highBloodGlucose) {
    rec('see_gp', 'metabolic', 1, 'Book a blood glucose check with your GP',
      'Early detection of pre-diabetes means it can often be reversed with lifestyle change.',
      ['Ask your GP for a fasting glucose or HbA1c test', 'Take this assessment summary to the appointment']);
  }

  if (answers.smoker) {
    rec('quit_smoking', 'lifestyle', 1, 'Make a plan to quit smoking',
      'Quitting improves heart, lung and metabolic health within weeks.',
      ['Call Quitline on 13 78 48 or visit quit.org.au', 'Talk to your GP or pharmacist about nicotine replacement']);
  }

  if (body.bmi >= 25 || body.waist?.key === 'high') {
    rec('weight', 'body', body.bmi >= 30 ? 1 : 2, 'Work towards a healthier weight',
      `Losing even 5 to 10% of your body weight (${Math.round(answers.weightKg * 0.05)} to ${Math.round(answers.weightKg * 0.1)} kg) brings measurable health benefits.`,
      [`Aim for about ${targets.calories.toLocaleString('en-AU')} kcal a day`, 'Fill half your plate with vegetables at lunch and dinner',
        'Swap sugary drinks for water or sparkling water']);
  } else if (body.bmiCategory.key === 'underweight') {
    rec('weight_gain', 'body', 2, 'Rebuild healthy weight',
      'Regular, nutrient-dense meals help restore energy and protect bone health.',
      ['Eat three meals and two to three snacks a day', 'Add healthy fats: nuts, avocado, olive oil',
        `Aim for about ${targets.calories.toLocaleString('en-AU')} kcal a day`]);
  }

  if (answers.activityFrequency < 2) {
    rec('move_more', 'activity', answers.activityFrequency === 0 ? 1 : 2, 'Build up to 150 active minutes a week',
      'Regular movement improves insulin sensitivity, mood and sleep, independent of weight loss.',
      [answers.workoutPlace === 'gym'
        ? `Start with ${Math.max(2, Math.min(answers.daysPerWeek || 3, 4))} gym sessions a week mixing cardio and strength`
        : `Start with ${Math.max(2, Math.min(answers.daysPerWeek || 3, 4))} home sessions a week: brisk walks plus body-weight strength`,
      'Add a 10-minute walk after meals', 'Include strength work twice a week']);
  }

  if (domainScores.nutrition < 70) {
    const actions = [];
    if (answers.vegetableFrequency < 3) actions.push('Add a serve of vegetables to every main meal (target 5 serves a day)');
    if (answers.highCalorieFoods) actions.push('Limit takeaway and fried food to once a week');
    if (answers.snacking === 'Frequently' || answers.snacking === 'Always') {
      actions.push('Plan snacks: fruit, yoghurt or a handful of nuts');
    }
    if (answers.mainMeals < 3) actions.push('Eat regular meals to avoid energy dips and over-eating later');
    if (!actions.length) actions.push('Use NutriHelp meal plans to keep variety high');
    rec('nutrition', 'nutrition', 2, 'Improve the quality of your meals',
      `A diet rich in vegetables, whole grains and lean protein supports your ${targets.fibreGrams} g daily fibre target.`, actions);
  }

  if (domainScores.hydration < 80) {
    rec('hydration', 'hydration', 3, `Drink about ${targets.waterLitres} L of water a day`,
      'Good hydration supports concentration, digestion and appetite control.',
      ['Keep a refillable bottle with you', 'Have a glass of water with every meal', 'Track intake with the NutriHelp water tracker']);
  }

  if (answers.sleepHours < 7 || answers.stressLevel >= 4) {
    rec('recovery', 'lifestyle', 2, 'Protect your sleep and manage stress',
      'Poor sleep and high stress raise hunger hormones and cravings for high-calorie food.',
      ['Keep a consistent sleep and wake time', 'Stop screens 30 minutes before bed', 'Try 10 minutes of walking or breathing exercises daily']);
  }

  if (answers.alcohol === 'Frequently' || answers.alcohol === 'Always') {
    rec('alcohol', 'lifestyle', 2, 'Cut back on alcohol',
      'Alcohol adds energy without nutrition and affects sleep and liver health.',
      ['Have at least two alcohol-free days a week', 'Alternate alcoholic drinks with water']);
  }

  if (answers.primaryGoal === 'build_muscle') {
    rec('protein', 'nutrition', 2, `Reach ${targets.proteinGrams} g of protein a day`,
      'Spreading protein across meals maximises muscle repair after training.',
      ['Include 25 to 40 g of protein at each meal', 'Do resistance training at least 3 times a week']);
  }

  if (!recs.length) {
    rec('maintain', 'lifestyle', 3, 'Keep up your healthy habits',
      'Your answers show a strong foundation. Consistency is what protects long-term health.',
      ['Reassess every 3 months to track progress', 'Try a new vegetable or recipe each week']);
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function assess(answers) {
  const body = computeBodyMetrics(answers);
  const targets = computeTargets(answers, body);
  const diabetesRisk = computeDiabetesRisk(answers, body);

  const rawScores = {
    body: scoreBody(body),
    nutrition: scoreNutrition(answers),
    activity: scoreActivity(answers),
    metabolic: scoreMetabolic(diabetesRisk, answers),
    lifestyle: scoreLifestyle(answers),
    hydration: scoreHydration(targets),
  };

  const domainScores = Object.fromEntries(
    Object.entries(rawScores).map(([key, value]) => [key, Math.round(value)])
  );

  const overall = Math.round(
    Object.entries(DOMAIN_WEIGHTS).reduce((sum, [key, weight]) => sum + rawScores[key] * weight, 0)
  );

  const domains = Object.keys(DOMAIN_WEIGHTS).map((key) => ({
    key,
    label: DOMAIN_LABELS[key],
    score: domainScores[key],
    weight: DOMAIN_WEIGHTS[key],
    band: band(domainScores[key]),
  }));

  const riskFlags = buildRiskFlags(answers, body, diabetesRisk, targets);
  const recommendations = buildRecommendations(answers, body, diabetesRisk, targets, domainScores);

  const highFlags = riskFlags.filter((f) => f.severity === 'high').length;
  let overallRisk;
  if (highFlags >= 2 || diabetesRisk.level.key === 'high') overallRisk = { key: 'high', label: 'High' };
  else if (highFlags === 1 || riskFlags.some((f) => f.severity === 'moderate')) overallRisk = { key: 'moderate', label: 'Moderate' };
  else overallRisk = { key: 'low', label: 'Low' };

  const sorted = [...domains].sort((a, b) => b.score - a.score);

  return {
    engineVersion: ENGINE_VERSION,
    overall: { score: overall, band: band(overall), risk: overallRisk },
    domains,
    strengths: sorted.filter((d) => d.score >= 75).slice(0, 3).map((d) => d.key),
    focusAreas: [...sorted].reverse().filter((d) => d.score < 70).slice(0, 3).map((d) => d.key),
    body,
    targets,
    diabetesRisk,
    riskFlags,
    recommendations,
  };
}

module.exports = {
  ENGINE_VERSION,
  DOMAIN_WEIGHTS,
  DOMAIN_LABELS,
  assess,
  classifyBmi,
  classifyWaist,
  computeBodyMetrics,
  computeTargets,
  computeDiabetesRisk,
  band,
};
