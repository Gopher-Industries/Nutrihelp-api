import React from 'react';

/**
 * Renders one questionnaire question. The question object comes straight from
 * GET /api/health-assessment/questions, so new questions need no UI changes.
 */
export default function QuestionField({ question, value, error, onChange }) {
  const fieldId = `ha-${question.id}`;
  const helpId = question.help ? `${fieldId}-help` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const legend = (
    <>
      <span className="ha-q__label">{question.label}</span>
      {!question.required && <span className="ha-q__optional">Optional</span>}
    </>
  );

  let control;
  switch (question.type) {
    case 'number':
      control = (
        <div className="ha-number">
          <input
            id={fieldId}
            type="number"
            inputMode="decimal"
            min={question.min}
            max={question.max}
            step={question.step}
            value={value ?? ''}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
          {question.unit && <span className="ha-number__unit">{question.unit}</span>}
        </div>
      );
      break;

    case 'boolean':
      control = (
        <div className="ha-choices ha-choices--pair" role="radiogroup" aria-labelledby={`${fieldId}-legend`} aria-describedby={describedBy}>
          {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((opt) => (
            <Choice key={String(opt.value)} name={fieldId} option={opt} checked={value === opt.value} onChange={onChange} />
          ))}
        </div>
      );
      break;

    case 'scale': {
      const steps = Array.from({ length: question.max - question.min + 1 }, (_, i) => question.min + i);
      control = (
        <div className="ha-scale" aria-describedby={describedBy}>
          <div className="ha-choices ha-choices--scale" role="radiogroup" aria-labelledby={`${fieldId}-legend`}>
            {steps.map((step) => (
              <Choice key={step} name={fieldId} option={{ value: step, label: String(step) }} checked={value === step} onChange={onChange} />
            ))}
          </div>
          <div className="ha-scale__ends" aria-hidden="true">
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </div>
        </div>
      );
      break;
    }

    case 'single':
    default:
      control = (
        <div
          className={`ha-choices ${question.options.length > 4 ? 'ha-choices--wrap' : ''}`}
          role="radiogroup"
          aria-labelledby={`${fieldId}-legend`}
          aria-describedby={describedBy}
        >
          {question.options.map((opt) => (
            <Choice key={String(opt.value)} name={fieldId} option={opt} checked={value === opt.value} onChange={onChange} />
          ))}
        </div>
      );
  }

  return (
    <div className={`ha-q ${error ? 'ha-q--error' : ''}`} id={`${fieldId}-wrap`}>
      {question.type === 'number' ? (
        <label className="ha-q__legend" id={`${fieldId}-legend`} htmlFor={fieldId}>{legend}</label>
      ) : (
        <div className="ha-q__legend" id={`${fieldId}-legend`}>{legend}</div>
      )}
      {question.help && <p className="ha-q__help" id={helpId}>{question.help}</p>}
      {control}
      {error && (
        <p className="ha-q__error" id={errorId} role="alert">{error}</p>
      )}
    </div>
  );
}

function Choice({ name, option, checked, onChange }) {
  return (
    <label className={`ha-choice ${checked ? 'is-checked' : ''}`}>
      <input type="radio" name={name} checked={checked} onChange={() => onChange(option.value)} />
      <span>{option.label}</span>
    </label>
  );
}
