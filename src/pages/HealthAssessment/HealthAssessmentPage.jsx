import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HealthAssessmentService } from '../../api/healthAssessment';
import QuestionField from './QuestionField';
import ResultsView from './ResultsView';
import HistoryPanel from './HistoryPanel';
import './HealthAssessment.css';

/**
 * FE-04 AI Health Assessment screen.
 *
 * Flow: intro (consent) → one step per questionnaire section → review →
 * submit → results. History and a previous result are reachable from the
 * intro and the results. The questionnaire comes from the API, so the wizard
 * has no hard-coded questions.
 */

const DRAFT_KEY = 'nutrihelp.healthAssessment.draft';
const SUBMIT_MESSAGES = [
  'Calculating your health scores',
  'Checking your answers with the NutriHelp AI model',
  'Writing your personal summary',
];

function readDraft() {
  try {
    return JSON.parse(window.sessionStorage.getItem(DRAFT_KEY)) || null;
  } catch {
    return null;
  }
}

function writeDraft(answers) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
  } catch {
    /* storage unavailable: the draft simply is not kept */
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function validateQuestion(question, value) {
  const empty = value === null || value === undefined || value === '';
  if (empty) return question.required ? 'Please answer this question.' : null;
  if (question.type === 'number' || question.type === 'scale') {
    if (!Number.isFinite(value)) return 'Enter a number.';
    if (value < question.min || value > question.max) {
      return `Enter a value between ${question.min} and ${question.max}${question.unit ? ` ${question.unit}` : ''}.`;
    }
    if (question.step === 1 && !Number.isInteger(value)) return 'Enter a whole number.';
  }
  return null;
}

function displayAnswer(question, value) {
  if (value === null || value === undefined || value === '') return 'Not answered';
  if (question.type === 'boolean') return value ? 'Yes' : 'No';
  if (question.options) return question.options.find((o) => o.value === value)?.label ?? String(value);
  if (question.type === 'scale') return `${value} of ${question.max}`;
  return `${value}${question.unit ? ` ${question.unit}` : ''}`;
}

export default function HealthAssessmentPage() {
  const [questionnaire, setQuestionnaire] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [latest, setLatest] = useState(null);
  const [view, setView] = useState('loading');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => readDraft() || {});
  const [errors, setErrors] = useState({});
  const [consent, setConsent] = useState(false);
  const [save, setSave] = useState(true);
  const [submitError, setSubmitError] = useState(null);
  const [submitMessage, setSubmitMessage] = useState(0);
  const [assessment, setAssessment] = useState(null);
  const headingRef = useRef(null);

  const sections = questionnaire?.sections || [];
  const reviewStep = sections.length;

  const loadQuestionnaire = useCallback(async () => {
    setLoadError(null);
    setView('loading');
    try {
      const data = await HealthAssessmentService.getQuestions();
      setQuestionnaire(data);
      setView('intro');
    } catch (error) {
      setLoadError(error.message || 'The assessment could not be loaded.');
      setView('error');
    }
  }, []);

  useEffect(() => {
    loadQuestionnaire();
    // A previous result is a convenience; failure (for example signed out) is not an error here.
    HealthAssessmentService.getLatest().then(setLatest).catch(() => setLatest(null));
  }, [loadQuestionnaire]);

  useEffect(() => { writeDraft(answers); }, [answers]);

  // Move focus to the step heading so keyboard and screen reader users land on new content.
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }, [view, step]);

  useEffect(() => {
    if (view !== 'submitting') return undefined;
    setSubmitMessage(0);
    const timer = setInterval(() => setSubmitMessage((i) => Math.min(i + 1, SUBMIT_MESSAGES.length - 1)), 1600);
    return () => clearInterval(timer);
  }, [view]);

  const progress = useMemo(() => {
    const required = sections.flatMap((s) => s.questions.filter((q) => q.required));
    const done = required.filter((q) => !validateQuestion(q, answers[q.id])).length;
    return required.length ? Math.round((done / required.length) * 100) : 0;
  }, [sections, answers]);

  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: null } : prev));
  };

  const validateSection = (section) => {
    const found = {};
    section.questions.forEach((q) => {
      const message = validateQuestion(q, answers[q.id]);
      if (message) found[q.id] = message;
    });
    setErrors((prev) => ({ ...prev, ...found }));
    const firstId = Object.keys(found)[0];
    if (firstId) document.getElementById(`ha-${firstId}-wrap`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !firstId;
  };

  const next = () => {
    if (step < reviewStep && !validateSection(sections[step])) return;
    setStep((s) => Math.min(s + 1, reviewStep));
  };

  const goTo = (index) => {
    // Only allow jumping forward past sections that are already complete.
    for (let i = 0; i < Math.min(index, reviewStep); i += 1) {
      if (sections[i].questions.some((q) => validateQuestion(q, answers[q.id]))) {
        setStep(i);
        validateSection(sections[i]);
        return;
      }
    }
    setStep(index);
  };

  const start = (prefill) => {
    if (prefill && latest?.answers) setAnswers(latest.answers);
    setErrors({});
    setSubmitError(null);
    setStep(0);
    setView('wizard');
  };

  const submit = async () => {
    setSubmitError(null);
    setView('submitting');
    try {
      const payload = Object.fromEntries(
        Object.entries(answers).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );
      const result = await HealthAssessmentService.submit(payload, { save });
      setAssessment(result);
      if (result.persisted) setLatest(result);
      clearDraft();
      setView('results');
    } catch (error) {
      if (Array.isArray(error.details)) {
        const mapped = Object.fromEntries(error.details.map((d) => [d.field, d.message]));
        setErrors(mapped);
        const sectionIndex = sections.findIndex((s) => s.questions.some((q) => mapped[q.id]));
        setStep(sectionIndex >= 0 ? sectionIndex : reviewStep);
        setView('wizard');
        return;
      }
      setSubmitError(
        error.status === 401
          ? 'Your session has expired. Sign in again to submit your assessment; your answers are kept.'
          : error.status === 429
            ? error.message
            : 'Your assessment could not be submitted. Check your connection and try again; your answers are kept.'
      );
      setStep(reviewStep);
      setView('wizard');
    }
  };

  // ---------------------------------------------------------------------------

  if (view === 'loading') {
    return (
      <main className="ha-page">
        <div className="ha-shell"><p className="ha-lede" role="status">Loading your health check…</p></div>
      </main>
    );
  }

  if (view === 'error') {
    return (
      <main className="ha-page">
        <div className="ha-shell ha-empty">
          <h1 tabIndex={-1} ref={headingRef}>The health check could not be loaded</h1>
          <p>{loadError}</p>
          <button type="button" className="ha-btn" onClick={loadQuestionnaire}>Try again</button>
        </div>
      </main>
    );
  }

  if (view === 'results' && assessment) {
    return (
      <main className="ha-page">
        <div className="ha-shell">
          <ResultsView assessment={assessment} onRetake={() => start(true)} onShowHistory={() => setView('history')} />
        </div>
      </main>
    );
  }

  if (view === 'history') {
    return (
      <main className="ha-page">
        <div className="ha-shell">
          <HistoryPanel
            onOpen={(a) => { setAssessment(a); setView('results'); }}
            onBack={assessment ? () => setView('results') : () => setView('intro')}
            onStart={() => start(false)}
          />
        </div>
      </main>
    );
  }

  if (view === 'submitting') {
    return (
      <main className="ha-page">
        <div className="ha-shell ha-submitting" aria-live="polite" aria-busy="true">
          <div className="ha-pulse" aria-hidden="true" />
          <h1 tabIndex={-1} ref={headingRef}>Analysing your answers</h1>
          <ol className="ha-submitting__steps">
            {SUBMIT_MESSAGES.map((message, i) => (
              <li key={message} className={i < submitMessage ? 'is-done' : i === submitMessage ? 'is-active' : ''}>{message}</li>
            ))}
          </ol>
        </div>
      </main>
    );
  }

  if (view === 'intro') {
    const hasDraft = Object.keys(answers).length > 0;
    return (
      <main className="ha-page">
        <div className="ha-shell ha-intro">
          <div className="ha-intro__main">
            <h1 tabIndex={-1} ref={headingRef} className="ha-intro__title">Health check-in</h1>
            <p className="ha-intro__lede">
              Answer {sections.reduce((n, s) => n + s.questions.length, 0)} questions about your body, eating,
              lifestyle and goals. In about {questionnaire.estimatedMinutes} minutes you get a wellness score across six
              areas, a type 2 diabetes screening, daily nutrition targets and an action plan ranked by impact.
            </p>

            <ul className="ha-intro__list">
              <li><strong>Private.</strong> Your answers are encrypted before they are stored and are linked only to your account.</li>
              <li><strong>Explained.</strong> Every score shows how it was worked out, using recognised clinical formulas.</li>
              <li><strong>AI-checked.</strong> Results are cross-checked with the NutriHelp AI model when it is available.</li>
            </ul>

            <div className="ha-consent">
              <label className="ha-check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I understand this is a wellbeing screening, not a medical diagnosis.</span>
              </label>
              <label className="ha-check">
                <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
                <span>Save my result so I can track progress over time.</span>
              </label>
            </div>

            <div className="ha-buttons">
              <button type="button" className="ha-btn" disabled={!consent} onClick={() => start(false)}>
                {hasDraft ? 'Continue where I left off' : 'Start assessment'}
              </button>
              {latest?.answers && (
                <button type="button" className="ha-btn ha-btn--ghost" disabled={!consent} onClick={() => start(true)}>
                  Start from my last answers
                </button>
              )}
            </div>
            {!consent && <p className="ha-footnote">Tick the first box to begin.</p>}
          </div>

          <aside className="ha-intro__side" aria-label="Your last result">
            {latest?.result ? (
              <>
                <p className="ha-intro__side-label">Your last result</p>
                <p className="ha-intro__side-score">{latest.result.overall.score}</p>
                <p>{latest.result.overall.band.label}, {new Date(latest.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <div className="ha-buttons ha-buttons--stack">
                  <button type="button" className="ha-btn ha-btn--ghost" onClick={() => { setAssessment(latest); setView('results'); }}>Open last result</button>
                  <button type="button" className="ha-btn ha-btn--quiet" onClick={() => setView('history')}>View history</button>
                </div>
              </>
            ) : (
              <>
                <p className="ha-intro__side-label">What you&apos;ll get</p>
                <ul className="ha-intro__areas">
                  {['Body composition', 'Nutrition', 'Physical activity', 'Metabolic health', 'Lifestyle', 'Hydration'].map((a) => <li key={a}>{a}</li>)}
                </ul>
              </>
            )}
          </aside>

          <p className="ha-disclaimer">{questionnaire.disclaimer}</p>
        </div>
      </main>
    );
  }

  // Wizard and review
  const section = sections[step];
  const isReview = step === reviewStep;

  return (
    <main className="ha-page">
      <div className="ha-shell ha-wizard">
        <nav className="ha-rail" aria-label="Assessment steps">
          <div className="ha-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Questions answered">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="ha-rail__progress">{progress}% answered</p>
          <ol className="ha-steps">
            {sections.map((s, i) => {
              const complete = s.questions.every((q) => !validateQuestion(q, answers[q.id]));
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`ha-step ${i === step ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`}
                    aria-current={i === step ? 'step' : undefined}
                    onClick={() => goTo(i)}
                  >
                    <span className="ha-step__num" aria-hidden="true">{complete && i !== step ? '✓' : i + 1}</span>
                    <span>{s.title}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className={`ha-step ${isReview ? 'is-current' : ''}`}
                aria-current={isReview ? 'step' : undefined}
                onClick={() => goTo(reviewStep)}
              >
                <span className="ha-step__num" aria-hidden="true">{sections.length + 1}</span>
                <span>Review</span>
              </button>
            </li>
          </ol>
        </nav>

        <section className="ha-panel" aria-labelledby="ha-step-title">
          {!isReview ? (
            <>
              <p className="ha-panel__count">Step {step + 1} of {sections.length + 1}</p>
              <h1 id="ha-step-title" tabIndex={-1} ref={headingRef}>{section.title}</h1>
              <p className="ha-lede">{section.description}</p>
              <div className="ha-questions">
                {section.questions.map((q) => (
                  <QuestionField key={q.id} question={q} value={answers[q.id]} error={errors[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="ha-panel__count">Step {reviewStep + 1} of {sections.length + 1}</p>
              <h1 id="ha-step-title" tabIndex={-1} ref={headingRef}>Check your answers</h1>
              <p className="ha-lede">Make sure everything is right, then get your results.</p>
              {submitError && <p className="ha-notice ha-notice--error" role="alert">{submitError}</p>}
              <div className="ha-review">
                {sections.map((s, i) => (
                  <div key={s.id} className="ha-review__section">
                    <div className="ha-review__head">
                      <h2>{s.title}</h2>
                      <button type="button" className="ha-btn ha-btn--quiet" onClick={() => setStep(i)} aria-label={`Edit ${s.title}`}>Edit</button>
                    </div>
                    <dl>
                      {s.questions.map((q) => (
                        <div key={q.id} className={errors[q.id] ? 'has-error' : ''}>
                          <dt>{q.label}</dt>
                          <dd>{displayAnswer(q, answers[q.id])}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="ha-nav">
            <button
              type="button"
              className="ha-btn ha-btn--ghost"
              onClick={() => (step === 0 ? setView('intro') : setStep(step - 1))}
            >
              Back
            </button>
            {isReview ? (
              <button type="button" className="ha-btn" onClick={submit}>Get my results</button>
            ) : (
              <button type="button" className="ha-btn" onClick={next}>
                {step === sections.length - 1 ? 'Review answers' : 'Continue'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
