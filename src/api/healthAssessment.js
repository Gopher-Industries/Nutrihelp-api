import api from './client';

/**
 * FE-04 AI Health Assessment API.
 *
 * Every call goes through the shared client, which unwraps the
 * { success, data } envelope and rejects with an Error carrying
 * `status` and `details` (field-level validation errors for 400s).
 *
 * The assessment endpoints need the signed-in user's access token. If your
 * app already adds the Authorization header in an axios interceptor, this
 * helper is harmless: it only fills the header when a token is found.
 */
const TOKEN_KEYS = ['accessToken', 'access_token', 'token', 'jwt'];

function authHeaders() {
  if (typeof window === 'undefined') return {};
  for (const key of TOKEN_KEYS) {
    const value = window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key);
    if (value) return { Authorization: `Bearer ${value.replace(/^Bearer\s+/i, '')}` };
  }
  return {};
}

const withAuth = (config = {}) => ({ ...config, headers: { ...authHeaders(), ...(config.headers || {}) } });

export const HealthAssessmentService = {
  /** Questionnaire definition that drives the wizard. Public. */
  getQuestions: () => api.get('/health-assessment/questions'),

  /** Submit answers. Resolves to the full assessment result. */
  submit: (answers, { save = true } = {}) =>
    api.post('/health-assessment', { answers, consent: true, save }, withAuth({ timeout: 30000 })),

  /** Most recent full assessment, or null. */
  getLatest: () => api.get('/health-assessment/latest', withAuth()),

  /** { items, trend, stats } */
  getHistory: (limit = 12) => api.get(`/health-assessment/history?limit=${limit}`, withAuth()),

  getById: (id) => api.get(`/health-assessment/${encodeURIComponent(id)}`, withAuth()),

  remove: (id) => api.delete(`/health-assessment/${encodeURIComponent(id)}`, withAuth()),

  /** 4-week plan generated from a saved assessment. */
  generatePlan: (id) =>
    api.post(`/health-assessment/${encodeURIComponent(id)}/plan`, {}, withAuth({ timeout: 30000 })),
};

export default HealthAssessmentService;
