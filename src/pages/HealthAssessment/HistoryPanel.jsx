import React, { useEffect, useState } from 'react';
import { HealthAssessmentService } from '../../api/healthAssessment';
import { toneFor } from './ScoreDial';

const BAND_LABEL = { excellent: 'Excellent', good: 'Good', fair: 'Fair', attention: 'Needs attention', priority: 'High priority' };
const RISK_LABEL = { low: 'Low risk', moderate: 'Moderate risk', high: 'High risk' };

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function HistoryPanel({ onOpen, onBack, onStart }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const data = await HealthAssessmentService.getHistory(20);
      setState({ status: 'ready', data, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error: error.message });
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    setBusyId(id);
    try {
      await HealthAssessmentService.remove(id);
      setConfirmId(null);
      await load();
    } catch (error) {
      setState((s) => ({ ...s, error: error.message }));
    } finally {
      setBusyId(null);
    }
  };

  const open = async (id) => {
    setBusyId(id);
    try {
      onOpen(await HealthAssessmentService.getById(id));
    } catch (error) {
      setState((s) => ({ ...s, error: error.message }));
      setBusyId(null);
    }
  };

  return (
    <section className="ha-history" aria-labelledby="ha-history-title">
      <div className="ha-history__head">
        <h1 id="ha-history-title">Assessment history</h1>
        {onBack && <button type="button" className="ha-btn ha-btn--ghost" onClick={onBack}>Back to results</button>}
      </div>

      {state.status === 'loading' && <p className="ha-lede" role="status">Loading your history…</p>}
      {state.error && <p className="ha-q__error" role="alert">{state.error}</p>}

      {state.status === 'ready' && state.data.items.length === 0 && (
        <div className="ha-empty">
          <p>You haven&apos;t saved an assessment yet. Complete one to start tracking your progress over time.</p>
          <button type="button" className="ha-btn" onClick={onStart}>Start assessment</button>
        </div>
      )}

      {state.status === 'ready' && state.data.items.length > 0 && (
        <>
          <div className="ha-history__summary">
            <Sparkline points={state.data.trend} />
            <dl className="ha-facts ha-facts--row">
              <div><dt>Latest</dt><dd>{state.data.stats.latestScore}</dd></div>
              <div><dt>Best</dt><dd>{state.data.stats.bestScore}</dd></div>
              <div>
                <dt>Change since first</dt>
                <dd>{state.data.stats.changeSinceFirst > 0 ? '+' : ''}{state.data.stats.changeSinceFirst}</dd>
              </div>
            </dl>
          </div>

          <ul className="ha-history__list">
            {state.data.items.map((item) => (
              <li key={item.id} className="ha-history__item">
                <span className={`ha-history__score ha-tone-${toneFor(item.overallScore)}`}>{item.overallScore}</span>
                <div className="ha-history__meta">
                  <span className="ha-history__date">{formatDate(item.createdAt)}</span>
                  <span>{BAND_LABEL[item.band] || item.band}, {RISK_LABEL[item.risk] || item.risk}</span>
                </div>
                {confirmId === item.id ? (
                  <div className="ha-buttons" role="group" aria-label="Confirm delete">
                    <span className="ha-history__confirm">Delete this assessment?</span>
                    <button type="button" className="ha-btn ha-btn--danger" disabled={busyId === item.id} onClick={() => remove(item.id)}>Delete</button>
                    <button type="button" className="ha-btn ha-btn--ghost" onClick={() => setConfirmId(null)}>Keep</button>
                  </div>
                ) : (
                  <div className="ha-buttons">
                    <button type="button" className="ha-btn ha-btn--ghost" disabled={busyId === item.id} onClick={() => open(item.id)}>Open</button>
                    <button type="button" className="ha-btn ha-btn--quiet" onClick={() => setConfirmId(item.id)} aria-label={`Delete assessment from ${formatDate(item.createdAt)}`}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Sparkline({ points }) {
  if (!points || points.length < 2) {
    return <p className="ha-lede">Complete another assessment to see your trend.</p>;
  }
  const w = 320;
  const h = 96;
  const pad = 10;
  const step = (w - pad * 2) / (points.length - 1);
  // Scale to the user's own range (with headroom) so real change is visible.
  const scores = points.map((p) => p.score);
  const lo = Math.max(0, Math.min(...scores, 70) - 8);
  const hi = Math.min(100, Math.max(...scores, 70) + 8);
  const y = (score) => h - pad - ((score - lo) / (hi - lo || 1)) * (h - pad * 2);
  const coords = points.map((p, i) => [pad + i * step, y(p.score)]);
  const path = coords.map(([x, yy], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${yy.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];

  return (
    <svg className="ha-spark" viewBox={`0 0 ${w} ${h}`} role="img"
      aria-label={`Score trend: ${points.map((p) => p.score).join(', ')}`}>
      <line x1={pad} x2={w - pad} y1={y(70)} y2={y(70)} className="ha-spark__goal" />
      <path d={path} className="ha-spark__line" />
      {coords.map(([x, yy], i) => <circle key={points[i].id} cx={x} cy={yy} r={i === coords.length - 1 ? 4.5 : 3} className="ha-spark__dot" />)}
      <text x={last[0] - 6} y={last[1] - 10} textAnchor="end" className="ha-spark__label">{points[points.length - 1].score}</text>
    </svg>
  );
}
