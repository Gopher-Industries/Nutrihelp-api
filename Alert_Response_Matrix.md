# Alert Response Matrix (CT-004 Week 5)

| Alert ID | Severity | Trigger Summary | Notification Channels | Immediate Response Actions | SLA (Time to Triage) |
|---|---|---|---|---|---|
| A1 | High | >=10 failed logins for same account in 10 min | Email: Cyber Security Lead, Backend Lead | Validate attack pattern, apply temporary lock, notify user, monitor IPs | <= 60 min |
| A2 | High | >=20 failed logins from one IP across >=3 accounts in 10 min | Email: Cyber Security Lead, Backend Lead | Apply IP controls, inspect targeted accounts, capture IOC evidence | <= 60 min |
| A3 | Critical | Login success after >=5 failures for same account in 5 min | Email (Urgent): Cyber Security Lead, Backend Lead | Revoke sessions/tokens, force step-up auth, open incident ticket | <= 15 min |
| A4 | High | >=5 MFA failures for same account in 10 min | Email: Cyber Security Lead, Backend Lead | Suspend MFA retries, verify account ownership, inspect source device/IP | <= 60 min |
| A5 | High | >=30 rate-limit (429) hits from same IP on sensitive endpoints in 15 min | Email: Backend Lead, Cyber Security Lead | Tighten throttling/ban, validate service health, escalate if AI endpoint impacted | <= 60 min |
| A6 | High | Concurrent impossible-geo sessions for same account within 30 min | Email: Cyber Security Lead | Revoke suspicious sessions, force re-auth, alert user, monitor account | <= 60 min |
| A7 | High | Token lifecycle anomaly: >=8 token events or >=3 rapid revoke/reissue loops in 10 min | Email: Backend Lead, Cyber Security Lead | Revoke suspect refresh tokens, inspect refresh endpoint abuse, verify client legitimacy | <= 60 min |
| A8 | Critical | Correlated incident confidence >=0.80 or 3+ high-risk signals in 10 min | Email (Urgent): Cyber Security Lead, Backend Lead, AI Lead (if AI) | Start P1 bridge, contain attack path, preserve forensics, periodic status updates | <= 15 min |
| A9 | Critical | Integrity tamper event: hash mismatch or missing critical file | Email (Urgent): Cyber Security Lead, Backend Lead | Isolate host/process, verify baseline drift, rollback if required, launch compromise investigation | <= 15 min |
| A10 | High | Monitoring ingestion/heartbeat failure >5 min | Email: Backend Lead, Cyber Security Lead | Restore pipeline, verify backlog replay, record blind spot and risk impact | <= 60 min |
| A11 | High/Critical | Security-critical error on auth/session/security routes; Critical if >=3 in 10 min | Email: Cyber Security Lead, Backend Lead | Identify blast radius, triage exploit vs bug, apply hotfix or route guard, escalate if repeated | <= 60 min (High), <= 15 min (Critical burst) |
| A12 | High | Decrypt failure anomaly: >=10 failures or >=30% failure rate in 15 min | Email: Cyber Security Lead, AI Lead, Backend Lead | Validate key usage/version, inspect replay/misuse, rotate keys if compromise suspected | <= 60 min |

