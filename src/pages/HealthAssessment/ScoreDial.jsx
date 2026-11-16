import React from 'react';

/**
 * The overall score as a segmented ring. Each segment is one health domain:
 * its length is the domain's weight in the overall score and its fill is the
 * domain's own score, so the ring shows at a glance which areas pull the
 * total up or down.
 */
const GAP_DEG = 4;
const R = 86;
const C = 100;

function polar(deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + R * Math.cos(rad), C + R * Math.sin(rad)];
}

function arc(start, end) {
  const [x1, y1] = polar(start);
  const [x2, y2] = polar(end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function toneFor(score) {
  if (score >= 70) return 'good';
  if (score >= 55) return 'fair';
  return 'low';
}

export default function ScoreDial({ score, bandLabel, domains }) {
  let cursor = 0;
  const segments = domains.map((domain) => {
    const sweep = domain.weight * 360;
    const start = cursor + GAP_DEG / 2;
    const end = cursor + sweep - GAP_DEG / 2;
    const fillEnd = start + (end - start) * Math.max(domain.score, 2) / 100;
    cursor += sweep;
    return { ...domain, start, end, fillEnd };
  });

  const description = domains.map((d) => `${d.label} ${d.score}`).join(', ');

  return (
    <figure className="ha-dial">
      <svg viewBox="0 0 200 200" role="img" aria-label={`Overall wellness score ${score} out of 100, ${bandLabel}. ${description}.`}>
        {segments.map((s) => (
          <g key={s.key}>
            <path d={arc(s.start, s.end)} className="ha-dial__track" />
            <path d={arc(s.start, s.fillEnd)} className={`ha-dial__fill ha-tone-${toneFor(s.score)}`}>
              <title>{`${s.label}: ${s.score}`}</title>
            </path>
          </g>
        ))}
      </svg>
      <figcaption className="ha-dial__center" aria-hidden="true">
        <span className="ha-dial__score">{score}</span>
        <span className="ha-dial__band">{bandLabel}</span>
      </figcaption>
    </figure>
  );
}
