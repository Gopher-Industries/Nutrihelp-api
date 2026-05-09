const { buildOverview } = require('./integrationAuditService');

const DEFAULT_REFRESH_MS = Number(process.env.LIVE_AUDIT_REFRESH_MS || 30000);

const state = {
  startedAt: new Date().toISOString(),
  refreshIntervalMs: DEFAULT_REFRESH_MS,
  schedulerStarted: false,
  timer: null,
  snapshot: null,
  inFlight: null,
  lastRunAt: null,
  nextRunAt: null,
  lastError: null,
};

function buildMeta(trigger = 'snapshot') {
  return {
    mode: 'live',
    trigger,
    startedAt: state.startedAt,
    refreshIntervalMs: state.refreshIntervalMs,
    lastRunAt: state.lastRunAt,
    nextRunAt: state.nextRunAt,
    lastError: state.lastError,
  };
}

async function refreshSnapshot(trigger = 'scheduler') {
  if (state.inFlight) {
    return state.inFlight;
  }

  state.inFlight = (async () => {
    try {
      const overview = await buildOverview();
      const checkedAt = new Date().toISOString();

      state.lastRunAt = checkedAt;
      state.nextRunAt = new Date(Date.now() + state.refreshIntervalMs).toISOString();
      state.lastError = null;
      state.snapshot = {
        ...overview,
        generatedAt: checkedAt,
        live: buildMeta(trigger),
      };

      return state.snapshot;
    } catch (error) {
      state.lastError = {
        message: error.message,
        at: new Date().toISOString(),
      };

      if (state.snapshot) {
        state.snapshot = {
          ...state.snapshot,
          live: buildMeta('stale-fallback'),
        };
        return state.snapshot;
      }

      throw error;
    } finally {
      state.inFlight = null;
    }
  })();

  return state.inFlight;
}

function startScheduler() {
  if (state.schedulerStarted) {
    return;
  }

  state.schedulerStarted = true;
  state.nextRunAt = new Date(Date.now() + state.refreshIntervalMs).toISOString();

  refreshSnapshot('bootstrap').catch(() => {
    // Errors are surfaced through the live endpoint metadata.
  });

  state.timer = setInterval(() => {
    refreshSnapshot('scheduler').catch(() => {
      // Keep the scheduler alive even if one run fails.
    });
  }, state.refreshIntervalMs);

  if (typeof state.timer.unref === 'function') {
    state.timer.unref();
  }
}

async function getLiveOverview(options = {}) {
  const { force = false } = options;
  startScheduler();

  if (force) {
    return refreshSnapshot('manual-refresh');
  }

  if (state.snapshot) {
    return {
      ...state.snapshot,
      live: buildMeta('snapshot'),
    };
  }

  return refreshSnapshot('initial-load');
}

function getLiveAuditState() {
  return {
    startedAt: state.startedAt,
    refreshIntervalMs: state.refreshIntervalMs,
    schedulerStarted: state.schedulerStarted,
    lastRunAt: state.lastRunAt,
    nextRunAt: state.nextRunAt,
    lastError: state.lastError,
    hasSnapshot: Boolean(state.snapshot),
  };
}

module.exports = {
  DEFAULT_REFRESH_MS,
  getLiveOverview,
  getLiveAuditState,
  refreshSnapshot,
  startScheduler,
};
