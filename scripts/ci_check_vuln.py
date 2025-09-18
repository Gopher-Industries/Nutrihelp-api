#!/usr/bin/env python3
"""CI helper: check vulnerability_report.json and fail if CRITICAL findings exist.

Exit codes:
  0 - no critical findings
  1 - error reading file or file missing
  2 - critical findings found
"""
import json
import sys
from pathlib import Path


def main():
    fn = Path('vulnerability_report.json')
    if not fn.exists():
        print('vulnerability_report.json not found', file=sys.stderr)
        return 1

    try:
        data = json.loads(fn.read_text(encoding='utf-8'))
    except Exception as e:
        print('Failed to read vulnerability_report.json:', e, file=sys.stderr)
        return 1

    try:
        bysev = data.get('summary', {}).get('by_severity', {})
        crit = int(bysev.get('CRITICAL', 0))
    except Exception:
        crit = 0

    if crit > 0:
        print(f'🚨 Found {crit} CRITICAL vulnerability(ies). Failing job as requested.')
        findings = data.get('findings', []) or []
        topcrit = [f for f in findings if str(f.get('severity', '')).upper() == 'CRITICAL']
        for i, f in enumerate(topcrit[:5], 1):
            title = f.get('title') or f.get('rule_name') or 'No title'
            path = f.get('file_path') or f.get('file') or ''
            print(f'{i}. {title} — {path}')
        return 2

    print('No critical findings. Proceeding.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
