const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { routeGroups } = require('../routes/routeGroups');
const aiServiceMonitor = require('./aiServiceMonitor');
const errorLogService = require('./errorLogService');
const { getSnapshot } = require('./requestAuditService');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const API_ROOT = path.join(WORKSPACE_ROOT, 'Nutrihelp-api');

const REPOSITORY_CANDIDATES = {
  web: ['Nutrihelp-web'],
  mobile: ['Nutrihelp-Mobile', 'NutriHelp-Mobile', 'NutriHelp-App-2026'],
  api: ['Nutrihelp-api'],
  ai: ['Nutrihelp-ai', 'NutriHelp-AI', 'NutriHelp AI', 'Nutrihelp-AI'],
};

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch (_error) {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function detectRepositoryPath(candidateNames = []) {
  for (const candidate of candidateNames) {
    const repoPath = path.join(WORKSPACE_ROOT, candidate);
    if (fileExists(repoPath)) {
      return repoPath;
    }
  }
  return null;
}

function buildRepositoryState() {
  return Object.entries(REPOSITORY_CANDIDATES).reduce((accumulator, [key, candidates]) => {
    const repoPath = detectRepositoryPath(candidates);
    accumulator[key] = {
      key,
      available: Boolean(repoPath),
      path: repoPath,
      name: repoPath ? path.basename(repoPath) : candidates[0],
    };
    return accumulator;
  }, {});
}

function probeUrl(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    if (!url) {
      resolve({ ok: false, statusCode: null, error: 'missing-url' });
      return;
    }

    const client = url.startsWith('https://') ? https : http;
    const request = client.request(
      url,
      { method: 'GET', timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 500,
          statusCode: response.statusCode,
          error: null,
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('timeout'));
    });

    request.on('error', (error) => {
      resolve({ ok: false, statusCode: null, error: error.code || error.message || 'request-failed' });
    });

    request.end();
  });
}

function buildRepositoryStatus({ state, status, runtimeUrl = null, note = null, repoType = null, runtimeReachable = null }) {
  return {
    ...state,
    repoType: repoType || state.key,
    status,
    runtimeUrl,
    runtimeReachable,
    note,
  };
}

async function enrichRepositoryState(repositories) {
  const results = {};
  const webRuntimeUrl = 'http://127.0.0.1:3000';
  const aiRuntimeUrl = 'http://127.0.0.1:8000/ai-model/chatbot/chat';

  if (!repositories.api.available) {
    results.api = buildRepositoryStatus({
      state: repositories.api,
      status: 'not-loaded',
      note: 'API repository is not present in the current workspace.',
    });
  } else {
    results.api = buildRepositoryStatus({
      state: repositories.api,
      status: 'running',
      runtimeUrl: 'http://127.0.0.1:8081/api',
      runtimeReachable: true,
      note: 'Current dashboard data is being served by this running API process.',
    });
  }

  if (!repositories.web.available) {
    results.web = buildRepositoryStatus({
      state: repositories.web,
      status: 'not-loaded',
      note: 'Frontend repository is not present in the current workspace.',
    });
  } else {
    const webProbe = await probeUrl(webRuntimeUrl);
    results.web = buildRepositoryStatus({
      state: repositories.web,
      status: webProbe.ok ? 'running' : 'code-only',
      runtimeUrl: webRuntimeUrl,
      runtimeReachable: webProbe.ok,
      note: webProbe.ok
        ? 'Frontend source is loaded and a local dev server is responding.'
        : 'Frontend source is available, but no local web runtime was detected on port 3000.',
    });
  }

  if (!repositories.mobile.available) {
    results.mobile = buildRepositoryStatus({
      state: repositories.mobile,
      status: 'not-loaded',
      note: 'Mobile repository is not present in the current workspace.',
    });
  } else {
    results.mobile = buildRepositoryStatus({
      state: repositories.mobile,
      status: 'code-only',
      note: 'Mobile source is available for route auditing, but no live Expo/device session is being tracked by this tool.',
    });
  }

  if (!repositories.ai.available) {
    results.ai = buildRepositoryStatus({
      state: repositories.ai,
      status: 'not-loaded',
      runtimeUrl: aiRuntimeUrl,
      runtimeReachable: false,
      note: 'AI repository is not present in the current workspace, so only route references can be inferred from web/api code.',
    });
  } else {
    const aiProbe = await probeUrl(aiRuntimeUrl);
    results.ai = buildRepositoryStatus({
      state: repositories.ai,
      status: aiProbe.ok ? 'running' : 'not-running',
      runtimeUrl: aiRuntimeUrl,
      runtimeReachable: aiProbe.ok,
      note: aiProbe.ok
        ? 'AI repository is loaded and the local AI runtime responded on port 8000.'
        : 'AI source is loaded, but no responding local runtime was detected on port 8000.',
    });
  }

  return results;
}

function extractImportMap(appSource) {
  const importMap = {};
  const importRegex = /^import\s+([A-Za-z0-9_{}\s,*]+)\s+from\s+["'](.+)["'];?$/gm;
  let match;

  while ((match = importRegex.exec(appSource)) !== null) {
    const imported = match[1].trim();
    const importPath = match[2];

    if (!importPath.startsWith('.')) continue;

    if (imported.startsWith('{')) {
      continue;
    }

    importMap[imported] = importPath;
  }

  return importMap;
}

function extractWebRoutes(appSource) {
  const routeRegex = /<Route\s+[^>]*path=["']([^"']+)["'][\s\S]*?element=\{[\s\S]*?<([A-Z][A-Za-z0-9_]*)\s*\/>[\s\S]*?\}\s*\/>/g;
  const routes = [];
  let match;

  while ((match = routeRegex.exec(appSource)) !== null) {
    routes.push({
      path: match[1],
      componentName: match[2],
    });
  }

  return routes;
}

function resolveModulePath(fromFile, importPath) {
  const basePath = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ];

  return candidates.find((candidate) => fileExists(candidate)) || null;
}

function extractRelativeImports(fileSource) {
  const imports = [];
  const importRegex = /^import\s+.+?\s+from\s+["'](.+)["'];?$/gm;
  let match;
  while ((match = importRegex.exec(fileSource)) !== null) {
    if (match[1].startsWith('.')) imports.push(match[1]);
  }
  return imports;
}

function extractApiRefs(fileSource) {
  const apiMatches = fileSource.match(/\/api\/[A-Za-z0-9/_-]+/g) || [];
  return [...new Set(apiMatches)];
}

function extractAiRefs(fileSource) {
  const aiMatches = fileSource.match(/\/ai-model\/[A-Za-z0-9/_-]+/g) || [];
  return [...new Set(aiMatches)];
}

function collectIntegrationRefs(filePath, visited = new Set(), depth = 0) {
  if (!filePath || visited.has(filePath) || depth > 2 || !fileExists(filePath)) {
    return { apiRefs: [], aiRefs: [] };
  }

  visited.add(filePath);
  const source = readText(filePath);
  const apiRefs = new Set(extractApiRefs(source));
  const aiRefs = new Set(extractAiRefs(source));

  extractRelativeImports(source).forEach((importPath) => {
    const resolved = resolveModulePath(filePath, importPath);
    if (!resolved) return;

    const nested = collectIntegrationRefs(resolved, visited, depth + 1);
    nested.apiRefs.forEach((item) => apiRefs.add(item));
    nested.aiRefs.forEach((item) => aiRefs.add(item));
  });

  return {
    apiRefs: [...apiRefs],
    aiRefs: [...aiRefs],
  };
}

function getBackendRoutes() {
  const mounted = routeGroups.flatMap((group) =>
    group.routes.map(([mountPath, modulePath]) => ({
      group: group.name,
      mountPath,
      modulePath,
    }))
  );

  mounted.push(
    { group: 'system', mountPath: '/api/system', modulePath: './systemRoutes' },
    { group: 'platform', mountPath: '/api/metrics', modulePath: 'server' },
    { group: 'platform', mountPath: '/api/health', modulePath: 'server' }
  );

  return mounted;
}

function normalizeBackendMatch(apiRef, backendRoutes) {
  return backendRoutes.find((route) => apiRef === route.mountPath || apiRef.startsWith(route.mountPath));
}

function buildWebAudit(repositories, backendRoutes) {
  const webRepo = repositories.web;
  if (!webRepo.available) {
    return {
      routes: [],
      unusedBackendRoutes: backendRoutes,
      emptyFrontendRoutes: [],
    };
  }

  const appPath = path.join(webRepo.path, 'src', 'App.js');
  if (!fileExists(appPath)) {
    return {
      routes: [],
      unusedBackendRoutes: backendRoutes,
      emptyFrontendRoutes: [],
    };
  }

  const appSource = readText(appPath);
  const importMap = extractImportMap(appSource);
  const webRoutes = extractWebRoutes(appSource).map((route) => {
    const importPath = importMap[route.componentName];
    const componentPath = importPath ? resolveModulePath(appPath, importPath) : null;
    const refs = collectIntegrationRefs(componentPath);
    const matchedBackendRoutes = refs.apiRefs
      .map((apiRef) => normalizeBackendMatch(apiRef, backendRoutes))
      .filter(Boolean);
    const unmatchedBackendRefs = refs.apiRefs.filter(
      (apiRef) => !normalizeBackendMatch(apiRef, backendRoutes)
    );

    let status = 'connected';
    if (refs.apiRefs.length === 0 && refs.aiRefs.length === 0) {
      status = 'empty-or-ui-only';
    } else if (unmatchedBackendRefs.length > 0) {
      status = 'backend-mismatch';
    }

    return {
      frontendRoute: route.path,
      componentName: route.componentName,
      componentFile: componentPath
        ? path.relative(webRepo.path, componentPath)
        : importPath || null,
      backendApis: refs.apiRefs,
      backendRouteMatches: matchedBackendRoutes.map((match) => match.mountPath),
      aiServices: refs.aiRefs,
      status,
      notes:
        status === 'backend-mismatch'
          ? `Unmatched API refs: ${unmatchedBackendRefs.join(', ')}`
          : status === 'empty-or-ui-only'
            ? 'No direct API or AI integrations detected in component/import graph.'
            : refs.aiRefs.length > 0 && refs.apiRefs.length === 0
              ? 'Direct AI integration detected. This frontend flow connects to NutriHelp-AI without going through Nutrihelp-api.'
            : null,
    };
  });

  const referencedBackendRoutes = new Set(
    webRoutes.flatMap((route) => route.backendRouteMatches)
  );

  return {
    routes: webRoutes,
    unusedBackendRoutes: backendRoutes.filter(
      (route) => !referencedBackendRoutes.has(route.mountPath)
    ),
    emptyFrontendRoutes: webRoutes.filter((route) => route.status === 'empty-or-ui-only'),
  };
}

function getRecentErrors(limit = 15) {
  const logPath = path.join(API_ROOT, 'logs', 'error_log.jsonl');
  if (!fileExists(logPath)) {
    return [];
  }

  const raw = readText(logPath).trim();
  if (!raw) return [];

  return raw
    .split('\n')
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return { message: line, timestamp: null, category: 'unknown', type: 'unknown' };
      }
    });
}

async function buildOverview() {
  const repositories = buildRepositoryState();
  const repositoryStatus = await enrichRepositoryState(repositories);
  const backendRoutes = getBackendRoutes();
  const webAudit = buildWebAudit(repositoryStatus, backendRoutes);
  const runtime = getSnapshot();
  const aiStats = aiServiceMonitor.getStats();
  const errorHealth = await errorLogService.healthCheck();
  const recentErrors = getRecentErrors();

  const chatbotApiCalls = runtime.requests.byPath
    .filter((entry) => entry.path.includes('/chatbot'))
    .reduce((sum, entry) => sum + entry.total, 0);

  const chatbotAiCalls = Object.entries(aiStats)
    .filter(([serviceName]) => serviceName.toLowerCase().includes('chatbot'))
    .reduce((sum, [, entry]) => sum + (entry.calls || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    repositories: Object.values(repositoryStatus),
    summary: {
      totalFrontendRoutes: webAudit.routes.length,
      totalBackendRoutes: backendRoutes.length,
      connectedRoutes: webAudit.routes.filter((route) => route.status === 'connected').length,
      emptyFrontendRoutes: webAudit.emptyFrontendRoutes.length,
      unusedBackendRoutes: webAudit.unusedBackendRoutes.length,
      chatbotRequests: chatbotApiCalls,
      chatbotAiCalls,
      recentErrorCount: recentErrors.length,
      repositoriesNotLoaded: Object.values(repositoryStatus).filter((repo) => repo.status === 'not-loaded').length,
      repositoriesCodeOnly: Object.values(repositoryStatus).filter((repo) => repo.status === 'code-only').length,
      repositoriesNotRunning: Object.values(repositoryStatus).filter((repo) => repo.status === 'not-running').length,
      repositoriesRunning: Object.values(repositoryStatus).filter((repo) => repo.status === 'running').length,
    },
    health: {
      api: {
        requestAuditStartedAt: runtime.startedAt,
        runtimeRequestCount: runtime.requests.total,
      },
      errorLogging: errorHealth,
      aiServices: aiStats,
    },
    routeAudit: webAudit.routes,
    unusedRoutes: {
      frontend: webAudit.emptyFrontendRoutes,
      backend: webAudit.unusedBackendRoutes,
    },
    requestOverview: runtime.requests,
    recentErrors,
  };
}

module.exports = {
  buildOverview,
};
