import React, { useState } from 'react';
import ScoreDial, { toneFor } from './ScoreDial';
import { HealthAssessmentService } from '../../api/healthAssessment';

const DOMAIN_HINTS = {
  body: 'BMI and waist measurement',
  nutrition: 'Vegetables, meal pattern and food choices',
  activity: 'Exercise, travel and screen time',
  metabolic: 'Type 2 diabetes screening',
  lifestyle: 'Sleep, stress, smoking and alcohol',
  hydration: 'Daily fluid against your target',
};

const SEVERITY_LABEL = { high: 'High', moderate: 'Moderate', low: 'Low' };

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export default function ResultsView({ assessment, onRetake, onShowHistory }) {
  const { result, ai, comparison } = assessment;
  const { overall, domains, body, targets, diabetesRisk, riskFlags, recommendations } = result;
  const narrative = ai?.narrative;
  const model = ai?.model;

  return (
    <article className="ha-results" aria-labelledby="ha-results-title">
      <header className="ha-hero">
        <ScoreDial score={overall.score} bandLabel={overall.band.label} domains={domains} />
        <div className="ha-hero__text">
          <p className="ha-hero__date">Assessment of {formatDate(assessment.createdAt)}</p>
          <h1 id="ha-results-title" className="ha-hero__headline">{narrative?.headline || `Your wellness score is ${overall.score}`}</h1>
          {narrative?.summary && <p className="ha-hero__summary">{narrative.summary}</p>}
          <div className="ha-hero__facts">
            <span className={`ha-pill ha-risk-${overall.risk.key}`}>{overall.risk.label} overall risk</span>
            {comparison && <TrendPill comparison={comparison} />}
          </div>
          {narrative?.motivation && <p className="ha-hero__motivation">{narrative.motivation}</p>}
          <p className="ha-source">
            {narrative?.source === 'llm'
              ? 'Summary written by NutriHelp AI from your scores.'
              : 'Summary generated from your scores.'}{' '}
            {model?.available
              ? 'Scores cross-checked with the NutriHelp AI model.'
              : 'The NutriHelp AI model was unavailable, so scores come from the clinical rules engine alone.'}
          </p>
          {!assessment.persisted && assessment.persistError && (
            <p className="ha-notice" role="status">{assessment.persistError}</p>
          )}
        </div>
      </header>

      <section className="ha-block" aria-labelledby="ha-domains-title">
        <h2 id="ha-domains-title">Your six health areas</h2>
        <ul className="ha-domains">
          {domains.map((d) => (
            <li key={d.key} className="ha-domain">
              <div className="ha-domain__head">
                <span className="ha-domain__label">{d.label}</span>
                <span className="ha-domain__score">{d.score}</span>
              </div>
              <div className="ha-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.score} aria-label={`${d.label} score`}>
                <span className={`ha-bar__fill ha-tone-${toneFor(d.score)}`} style={{ width: `${d.score}%` }} />
              </div>
              <span className="ha-domain__hint">{DOMAIN_HINTS[d.key]}. Counts for {Math.round(d.weight * 100)}% of your score.</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="ha-split">
        <section className="ha-block" aria-labelledby="ha-body-title">
          <h2 id="ha-body-title">Body measurements</h2>
          <BmiScale bmi={body.bmi} category={body.bmiCategory.label} />
          <dl className="ha-facts">
            <div><dt>Healthy weight for your height</dt><dd>{body.healthyWeightRangeKg.min} to {body.healthyWeightRangeKg.max} kg</dd></div>
            {body.waist && <div><dt>Waist</dt><dd>{body.waist.label}</dd></div>}
            {body.waistToHeightRatio && <div><dt>Waist to height ratio</dt><dd>{body.waistToHeightRatio} <small>(aim for under 0.5)</small></dd></div>}
          </dl>
        </section>

        <section className="ha-block" aria-labelledby="ha-targets-title">
          <h2 id="ha-targets-title">Your daily targets</h2>
          <dl className="ha-targets">
            <Target value={targets.calories.toLocaleString()} unit="kcal" label="Energy" note={targets.calorieStrategy} />
            <Target value={targets.proteinGrams} unit="g" label="Protein" />
            <Target value={targets.waterLitres} unit="L" label="Water" note={`You drink about ${targets.waterCurrentLitres} L now`} />
            <Target value={targets.fibreGrams} unit="g" label="Fibre" />
            <Target value={targets.activityMinutesPerWeek} unit="min" label="Activity per week" />
          </dl>
          <p className="ha-footnote">Resting energy {targets.bmr.toLocaleString()} kcal (Mifflin-St Jeor), {targets.tdee.toLocaleString()} kcal with your activity.</p>
        </section>
      </div>

      {riskFlags.length > 0 && (
        <section className="ha-block" aria-labelledby="ha-flags-title">
          <h2 id="ha-flags-title">What needs attention</h2>
          <ul className="ha-flags">
            {riskFlags.map((flag) => (
              <li key={flag.id} className={`ha-flag ha-sev-${flag.severity}`}>
                <span className="ha-flag__sev">{SEVERITY_LABEL[flag.severity]}</span>
                <div>
                  <p className="ha-flag__title">{flag.title}</p>
                  <p className="ha-flag__detail">{flag.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ha-block" aria-labelledby="ha-plan-title">
        <h2 id="ha-plan-title">Your action plan</h2>
        <p className="ha-lede">Ordered by impact. Start with the first and add the next once it feels routine.</p>
        <ol className="ha-actions">
          {recommendations.map((rec) => (
            <li key={rec.id} className="ha-action">
              <h3>{rec.title}</h3>
              <p>{rec.rationale}</p>
              <ul>
                {rec.actions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <div className="ha-split">
        <section className="ha-block" aria-labelledby="ha-diabetes-title">
          <h2 id="ha-diabetes-title">Type 2 diabetes screening</h2>
          <p className="ha-big">
            <span className={`ha-risk-text ha-risk-${diabetesRisk.level.key === 'intermediate' ? 'moderate' : diabetesRisk.level.key}`}>{diabetesRisk.level.label} risk</span>
            <span className="ha-big__sub">{diabetesRisk.score} of {diabetesRisk.maxScore} points</span>
          </p>
          {diabetesRisk.factors.length > 0 && (
            <ul className="ha-factors">
              {diabetesRisk.factors.map((f) => (
                <li key={f.label}><span>{f.label}</span><span>+{f.points}</span></li>
              ))}
            </ul>
          )}
          <p className="ha-footnote">
            {diabetesRisk.method}. 12 points or more is high risk.
            {diabetesRisk.waistEstimated && ' Add your waist measurement next time for a more accurate result.'}
          </p>
        </section>

        <section className="ha-block" aria-labelledby="ha-ai-title">
          <h2 id="ha-ai-title">AI model check</h2>
          {model?.available ? (
            <dl className="ha-facts">
              {model.obesity && (
                <div>
                  <dt>Weight classification</dt>
                  <dd>
                    {model.obesity.label}
                    {model.obesity.confidence != null && <small> ({model.obesity.confidence}% confidence)</small>}
                    <Agreement agrees={model.obesity.agreesWithBmi} text="your BMI" />
                  </dd>
                </div>
              )}
              {model.diabetes && (
                <div>
                  <dt>Diabetes risk signal</dt>
                  <dd>
                    {model.diabetes.positive ? 'Signal detected' : 'No signal detected'}
                    {model.diabetes.confidence != null && <small> ({model.diabetes.confidence}% confidence)</small>}
                    <Agreement agrees={model.diabetes.agreesWithScreening} text="the screening score" />
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="ha-lede">
              The NutriHelp AI model could not be reached for this assessment. Your results are complete and come from the
              clinical rules engine. Retake later to add the model&apos;s cross-check.
            </p>
          )}
        </section>
      </div>

      <WeeklyPlan assessment={assessment} />

      <footer className="ha-results__footer">
        <div className="ha-buttons">
          <button type="button" className="ha-btn ha-btn--ghost" onClick={() => window.print()}>Print or save as PDF</button>
          <button type="button" className="ha-btn ha-btn--ghost" onClick={onShowHistory}>View history</button>
          <button type="button" className="ha-btn ha-btn--ghost" onClick={onRetake}>Retake assessment</button>
        </div>
        <p className="ha-disclaimer">{assessment.disclaimer}</p>
      </footer>
    </article>
  );
}

function TrendPill({ comparison }) {
  const { delta, previousDate, trend } = comparison;
  const text =
    trend === 'steady'
      ? `Steady since ${formatDate(previousDate)}`
      : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points since ${formatDate(previousDate)}`;
  return <span className={`ha-pill ha-trend-${trend}`}>{text}</span>;
}

function Agreement({ agrees, text }) {
  if (agrees == null) return null;
  return (
    <span className={`ha-agree ${agrees ? 'is-yes' : 'is-no'}`}>
      {agrees ? `Agrees with ${text}` : `Differs from ${text}; ask your GP if unsure`}
    </span>
  );
}

function Target({ value, unit, label, note }) {
  return (
    <div className="ha-target">
      <dt>{label}</dt>
      <dd>
        <span className="ha-target__value">{value}</span>
        <span className="ha-target__unit">{unit}</span>
        {note && <span className="ha-target__note">{note}</span>}
      </dd>
    </div>
  );
}

const BMI_MIN = 15;
const BMI_MAX = 40;
const BMI_BANDS = [
  { to: 18.5, label: 'Under', tone: 'fair' },
  { to: 25, label: 'Healthy', tone: 'good' },
  { to: 30, label: 'Over', tone: 'fair' },
  { to: 40, label: 'Obese', tone: 'low' },
];

function BmiScale({ bmi, category }) {
  const pos = (v) => ((Math.min(Math.max(v, BMI_MIN), BMI_MAX) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100;
  let from = BMI_MIN;
  return (
    <div className="ha-bmi">
      <p className="ha-big">
        <span className="ha-big__num">{bmi}</span>
        <span className="ha-big__sub">BMI, {category.toLowerCase()}</span>
      </p>
      <div className="ha-bmi__scale" aria-hidden="true">
        {BMI_BANDS.map((band) => {
          const width = pos(band.to) - pos(from);
          from = band.to;
          return (
            <span key={band.label} className={`ha-bmi__band ha-tone-${band.tone}`} style={{ width: `${width}%` }}>
              {band.label}
            </span>
          );
        })}
        <span className="ha-bmi__marker" style={{ left: `${pos(bmi)}%` }} />
      </div>
      <div className="ha-bmi__ticks" aria-hidden="true">
        {[18.5, 25, 30].map((t) => <span key={t} style={{ left: `${pos(t)}%` }}>{t}</span>)}
      </div>
    </div>
  );
}

function WeeklyPlan({ assessment }) {
  const [state, setState] = useState({ status: 'idle', plan: null, error: null });

  if (!assessment.id) return null;

  const generate = async () => {
    setState({ status: 'loading', plan: null, error: null });
    try {
      const plan = await HealthAssessmentService.generatePlan(assessment.id);
      setState({ status: 'done', plan, error: null });
    } catch (error) {
      setState({ status: 'error', plan: null, error: error.message || 'The plan could not be generated. Try again in a moment.' });
    }
  };

  return (
    <section className="ha-block ha-weekly" aria-labelledby="ha-weekly-title" aria-busy={state.status === 'loading'}>
      <div className="ha-weekly__head">
        <div>
          <h2 id="ha-weekly-title">4-week plan</h2>
          <p className="ha-lede">Turn these results into a week-by-week routine for calories, training and meals.</p>
        </div>
        {state.status !== 'done' && (
          <button type="button" className="ha-btn" onClick={generate} disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Building your plan…' : 'Build my 4-week plan'}
          </button>
        )}
      </div>
      {state.status === 'error' && <p className="ha-q__error" role="alert">{state.error}</p>}
      {state.plan?.weekly_plan && (
        <>
          {state.plan.suggestion && <p className="ha-lede">{state.plan.suggestion}</p>}
          <ol className="ha-weeks">
            {state.plan.weekly_plan.map((week) => (
              <li key={week.week} className="ha-week">
                <h3>Week {week.week}</h3>
                <p className="ha-week__focus">{week.focus}</p>
                <p className="ha-week__kcal">{Number(week.target_calories_per_day).toLocaleString()} kcal a day</p>
                <ul>{(week.workouts || []).map((w) => <li key={w}>{w}</li>)}</ul>
                {week.meal_notes && <p className="ha-week__notes">{week.meal_notes}</p>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
