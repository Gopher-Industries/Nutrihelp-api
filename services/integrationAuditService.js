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

const STALE_ROUTE_THRESHOLD_MS = 10 * 60 * 1000;

const CONTRACT_PROFILES = {
  '/api/mealplan': {
    requiredFields: ['success', 'data', 'data.items'],
    optionalFields: ['meta', 'data.summary'],
    aliases: {
      'data.items': ['mealPlan', 'mealPlans', 'meal_plan'],
      'data.summary': ['summary', 'totals'],
    },
  },
  '/api/recommendations': {
    requiredFields: ['success', 'data', 'data.items'],
    optionalFields: ['meta', 'meta.count', 'meta.generatedAt'],
    aliases: {
      'data.items': ['recommendations', 'recipes'],
    },
  },
  '/api/recipe': {
    requiredFields: ['success', 'data'],
    optionalFields: ['data.recipe', 'data.items'],
    aliases: {
      'data.recipe': ['recipes', 'recipe'],
      'data.items': ['recipes'],
    },
  },
  '/api/profile': {
    requiredFields: ['success', 'data'],
    optionalFields: ['data.profile', 'data.id', 'data.email'],
    aliases: {
      'data.profile': ['profile'],
    },
  },
  '/api/barcode': {
    requiredFields: ['success', 'data', 'data.scan'],
    optionalFields: ['meta'],
    aliases: {
      'data.scan': ['classification', 'detectionResult', 'productName'],
    },
  },
  '/api/imageClassification': {
    requiredFields: ['success', 'data', 'data.scan'],
    optionalFields: ['meta'],
    aliases: {
      'data.scan': ['classification', 'productName'],
    },
  },
  '/api/recipeImageClassification': {
    requiredFields: ['success', 'data', 'data.scan'],
    optionalFields: ['meta'],
    aliases: {
      'data.scan': ['classification', 'recipe'],
    },
  },
  '/api/system/live-audit': {
    requiredFields: ['success', 'data'],
    optionalFields: ['meta', 'data.repositories', 'data.routeAudit'],
    aliases: {},
  },
};

const DEFAULT_CONTRACT_PROFILE = {
  requiredFields: ['success'],
  optionalFields: ['data', 'meta', 'error.message'],
  aliases: {},
};

const DATA_QUALITY_PROFILES = {
  '/api/recommendations': {
    requiredValues: ['success', 'data.items'],
    nonEmptyArrays: ['data.items'],
    nonBlankStrings: ['data.items.0.title'],
    notes: ['Recommendation payloads should return a non-empty items array with a title.'],
  },
  '/api/mealplan': {
    requiredValues: ['success', 'data.items'],
    nonEmptyArrays: ['data.items'],
    nonBlankStrings: ['data.items.0.mealType'],
    notes: ['Meal plan payloads should return at least one item with a meal type.'],
  },
  '/api/recipe': {
    requiredValues: ['success'],
    nonEmptyArrays: ['data.ingredients', 'data.instructions', 'data.recipe.ingredients', 'data.recipe.instructions'],
    nonBlankStrings: ['data.title', 'data.recipe.title'],
    notes: ['Recipe detail payloads should include title plus non-empty ingredients and instructions.'],
  },
  '/api/barcode': {
    requiredValues: ['success', 'data.scan'],
    nonBlankStrings: ['data.scan.label', 'data.scan.classification.label'],
    notes: ['Barcode scan payloads should return the unified scan contract with a label/classification.'],
  },
  '/api/imageClassification': {
    requiredValues: ['success', 'data.classification'],
    nonBlankStrings: ['data.classification.rawLabel', 'data.classification.label'],
    notes: ['Image classification payloads should expose classification output with a label.'],
  },
};

function fileExists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch (_error) {
    return false;
  }
}

function isReadableFile(targetPath) {
  try {
    return fs.statSync(targetPath).isFile();
  } catch (_error) {
    return false;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function stripQueryString(value) {
  return String(value || '').split('?')[0];
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ');
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
    const rawRoute = match[0];
    routes.push({
      path: match[1],
      componentName: match[2],
      authMode: rawRoute.includes('InternalAdminRoute')
        ? 'requires-admin'
        : rawRoute.includes('AuthenticateRoute')
          ? 'requires-auth'
          : 'public',
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
  const requireRegex = /require\(\s*["'](.+?)["']\s*\)/g;
  let match;
  while ((match = importRegex.exec(fileSource)) !== null) {
    if (match[1].startsWith('.')) imports.push(match[1]);
  }
  while ((match = requireRegex.exec(fileSource)) !== null) {
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
  if (!filePath || visited.has(filePath) || depth > 4 || !isReadableFile(filePath)) {
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
    apiRefs: unique([...apiRefs]),
    aiRefs: unique([...aiRefs]),
  };
}

function collectSourceFiles(filePath, visited = new Set(), depth = 0) {
  if (!filePath || visited.has(filePath) || depth > 4 || !isReadableFile(filePath)) {
    return [];
  }

  visited.add(filePath);
  const source = readText(filePath);
  const files = [filePath];

  extractRelativeImports(source).forEach((importPath) => {
    const resolved = resolveModulePath(filePath, importPath);
    if (!resolved) return;
    files.push(...collectSourceFiles(resolved, visited, depth + 1));
  });

  return unique(files);
}

function resolveBackendModulePath(modulePath) {
  const routeGroupsFile = path.join(API_ROOT, 'routes', 'routeGroups.js');
  return resolveModulePath(routeGroupsFile, modulePath);
}

function getBackendRoutes() {
  const mounted = routeGroups.flatMap((group) =>
    group.routes.map(([mountPath, modulePath]) => ({
      group: group.name,
      mountPath,
      modulePath,
      moduleFile: resolveBackendModulePath(modulePath),
    }))
  );

  mounted.push(
    { group: 'system', mountPath: '/api/system', modulePath: './systemRoutes' },
    { group: 'platform', mountPath: '/api/metrics', modulePath: 'server' },
    { group: 'platform', mountPath: '/api/health', modulePath: 'server' }
  );

  return mounted;
}

function buildBackendRouteDetails(backendRoutes) {
  return backendRoutes.reduce((accumulator, route) => {
    const refs = collectIntegrationRefs(route.moduleFile);
    const sourceFiles = collectSourceFiles(route.moduleFile);
    accumulator[route.mountPath] = {
      ...route,
      apiRefs: refs.apiRefs.filter((apiRef) => apiRef !== route.mountPath),
      aiRefs: refs.aiRefs,
      sourceFiles,
      sourceBundle: sourceFiles.map((filePath) => readText(filePath)).join('\n'),
    };
    return accumulator;
  }, {});
}

function normalizeBackendMatch(apiRef, backendRoutes) {
  return backendRoutes.find((route) => apiRef === route.mountPath || apiRef.startsWith(route.mountPath));
}

function normalizeRequestPath(pathname) {
  return stripQueryString(pathname).replace(/\/+$/, '') || '/';
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasFieldToken(source, token) {
  if (!token) return false;
  const normalized = normalizeWhitespace(source);
  const pattern = new RegExp(`(?:['"\`]|\\b)${regexEscape(token)}(?:['"\`]|\\b)`, 'i');
  return pattern.test(normalized);
}

function getContractProfile(mountPath) {
  const match = Object.keys(CONTRACT_PROFILES)
    .sort((left, right) => right.length - left.length)
    .find((prefix) => mountPath === prefix || mountPath.startsWith(`${prefix}/`));

  return match ? CONTRACT_PROFILES[match] : DEFAULT_CONTRACT_PROFILE;
}

function getDataQualityProfile(mountPath) {
  const match = Object.keys(DATA_QUALITY_PROFILES)
    .sort((left, right) => right.length - left.length)
    .find((prefix) => mountPath === prefix || mountPath.startsWith(`${prefix}/`));

  return match ? DATA_QUALITY_PROFILES[match] : null;
}

function getValueAtPath(payload, fieldPath) {
  if (!payload || !fieldPath) return undefined;
  return String(fieldPath)
    .split('.')
    .filter(Boolean)
    .reduce((value, segment) => {
      if (value == null) return undefined;
      if (Array.isArray(value) && /^\d+$/.test(segment)) {
        return value[Number(segment)];
      }
      return value[segment];
    }, payload);
}

function hasMeaningfulValue(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pickFirstExistingValue(payload, candidatePaths = []) {
  for (const candidatePath of candidatePaths) {
    const value = getValueAtPath(payload, candidatePath);
    if (value !== undefined) {
      return { path: candidatePath, value };
    }
  }
  return { path: null, value: undefined };
}

function evaluatePathGroup(payload, candidateGroups = []) {
  const matched = [];
  const missing = [];

  candidateGroups.forEach((group) => {
    const candidates = Array.isArray(group) ? group : [group];
    const result = pickFirstExistingValue(payload, candidates);
    if (hasMeaningfulValue(result.value)) {
      matched.push(result.path || candidates[0]);
    } else {
      missing.push(candidates.join(' | '));
    }
  });

  return { matched, missing };
}

function validateSampleData(endpoint, sampleResponse) {
  if (!sampleResponse?.responseBody || typeof sampleResponse.responseBody !== 'object') {
    return {
      status: 'no-sample',
      endpoint,
      missingValues: [],
      emptyArrays: [],
      blankStrings: [],
      notes: ['No runtime response sample has been captured for this endpoint yet.'],
      capturedAt: null,
    };
  }

  const profile = getDataQualityProfile(endpoint);
  if (!profile) {
    return {
      status: 'not-configured',
      endpoint,
      missingValues: [],
      emptyArrays: [],
      blankStrings: [],
      notes: ['No explicit data quality profile is configured for this endpoint.'],
      capturedAt: sampleResponse.capturedAt,
    };
  }

  const responseBody = sampleResponse.responseBody;
  const requiredCheck = evaluatePathGroup(responseBody, profile.requiredValues || []);
  const nonEmptyArrayCheck = evaluatePathGroup(
    responseBody,
    (profile.nonEmptyArrays || []).map((value) => [value])
  );
  const nonBlankStringCheck = evaluatePathGroup(
    responseBody,
    (profile.nonBlankStrings || []).map((value) => [value])
  );

  let status = 'healthy';
  if (requiredCheck.missing.length > 0) {
    status = 'missing-values';
  } else if (nonEmptyArrayCheck.missing.length > 0 || nonBlankStringCheck.missing.length > 0) {
    status = 'partial-data';
  }

  return {
    status,
    endpoint,
    missingValues: requiredCheck.missing,
    emptyArrays: nonEmptyArrayCheck.missing,
    blankStrings: nonBlankStringCheck.missing,
    notes: profile.notes || [],
    capturedAt: sampleResponse.capturedAt,
    requestPath: sampleResponse.requestPath,
    sampleBody: sampleResponse.responseBody,
  };
}

function hasFieldPath(source, fieldPath, usesStandardEnvelope) {
  if (fieldPath === 'success' || fieldPath === 'data') {
    return usesStandardEnvelope || hasFieldToken(source, fieldPath);
  }

  if (fieldPath === 'error.message') {
    return usesStandardEnvelope || (hasFieldToken(source, 'error') && hasFieldToken(source, 'message'));
  }

  const segments = String(fieldPath).split('.').filter(Boolean);
  if (!segments.length) return false;
  if (usesStandardEnvelope && (segments[0] === 'data' || segments[0] === 'error')) {
    return segments.slice(1).every((segment) => hasFieldToken(source, segment));
  }

  return segments.every((segment) => hasFieldToken(source, segment));
}

function validateBackendContract(routeDetail) {
  if (!routeDetail?.sourceBundle) {
    return {
      status: 'unknown',
      profile: 'unavailable',
      requiredFields: [],
      missingFields: [],
      optionalMissingFields: [],
      renamedFields: [],
      detectedAliases: [],
      notes: ['No source bundle was available for contract validation.'],
    };
  }

  const profile = getContractProfile(routeDetail.mountPath);
  const usesStandardEnvelope = hasFieldToken(routeDetail.sourceBundle, 'createSuccessResponse')
    || hasFieldToken(routeDetail.sourceBundle, 'createErrorResponse');

  const missingFields = profile.requiredFields.filter(
    (fieldPath) => !hasFieldPath(routeDetail.sourceBundle, fieldPath, usesStandardEnvelope)
  );

  const optionalMissingFields = (profile.optionalFields || []).filter(
    (fieldPath) => !hasFieldPath(routeDetail.sourceBundle, fieldPath, usesStandardEnvelope)
  );

  const renamedFields = [];
  const detectedAliases = [];

  Object.entries(profile.aliases || {}).forEach(([expectedField, aliases]) => {
    const matchedAliases = aliases.filter((alias) => hasFieldToken(routeDetail.sourceBundle, alias));
    if (matchedAliases.length > 0) {
      detectedAliases.push(...matchedAliases);
      if (missingFields.includes(expectedField)) {
        renamedFields.push({
          expectedField,
          detectedAliases: matchedAliases,
        });
      }
    }
  });

  let status = 'valid';
  if (missingFields.length > 0) {
    status = renamedFields.length > 0 ? 'renamed-fields-detected' : 'missing-required-fields';
  } else if (optionalMissingFields.length > 0 || detectedAliases.length > 0) {
    status = 'partial';
  }

  return {
    status,
    profile: routeDetail.mountPath,
    requiredFields: profile.requiredFields,
    missingFields,
    optionalMissingFields,
    renamedFields,
    detectedAliases: unique(detectedAliases),
    notes: [
      usesStandardEnvelope
        ? 'Standard success/error response helpers detected in source.'
        : 'Legacy or custom response contract detected in source.',
    ],
  };
}

function findRelatedRequests(endpoint, requestOverview) {
  const normalizedEndpoint = normalizeRequestPath(endpoint);
  return (requestOverview?.byPath || []).filter((entry) => {
    const requestPath = normalizeRequestPath(entry.path);
    return requestPath === normalizedEndpoint || requestPath.startsWith(`${normalizedEndpoint}/`);
  });
}

function summariseRequests(endpoint, requestOverview) {
  const related = findRelatedRequests(endpoint, requestOverview);
  return {
    endpoint,
    total: related.reduce((sum, entry) => sum + (entry.total || 0), 0),
    serverErrors: related.reduce(
      (sum, entry) => sum + ((entry.lastStatusCode >= 500 && entry.total) ? 1 : 0),
      0
    ),
    clientErrors: related.reduce(
      (sum, entry) => sum + ((entry.lastStatusCode >= 400 && entry.lastStatusCode < 500 && entry.total) ? 1 : 0),
      0
    ),
    lastCalledAt: related
      .map((entry) => entry.lastCalledAt)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null,
    lastStatusCode: related
      .map((entry) => ({ statusCode: entry.lastStatusCode, at: entry.lastCalledAt }))
      .filter((entry) => entry.at)
      .sort((left, right) => String(left.at).localeCompare(String(right.at)))
      .slice(-1)[0]?.statusCode || null,
    recent: (requestOverview?.recent || []).filter((entry) => {
      const requestPath = normalizeRequestPath(entry.path);
      return requestPath === normalizedEndpoint || requestPath.startsWith(`${normalizedEndpoint}/`);
    }).slice(0, 8),
  };
}

function extractAiKeywords(aiRef) {
  return unique(
    stripQueryString(aiRef)
      .split('/')
      .filter(Boolean)
      .filter((segment) => segment !== 'ai-model')
      .flatMap((segment) => segment.split(/[-_]/))
      .map((segment) => segment.toLowerCase())
      .filter((segment) => segment.length > 2)
  );
}

function matchAiStats(aiRef, aiStats) {
  const keywords = extractAiKeywords(aiRef);
  const matched = Object.values(aiStats).filter((service) => {
    const serviceName = String(service.service || '').toLowerCase();
    return keywords.some((keyword) => serviceName.includes(keyword) || keyword.includes(serviceName));
  });

  if (matched.length > 0) {
    return matched;
  }

  return Object.values(aiStats).filter((service) => {
    const recentErrors = service.recentErrors || [];
    return recentErrors.some((entry) => {
      const scriptPath = String(entry?.context?.scriptPath || '').toLowerCase();
      return keywords.some((keyword) => scriptPath.includes(keyword));
    });
  });
}

function buildApiLayer(backedRouteMatches, backendRouteDetails, requestOverview) {
  return unique(backedRouteMatches).map((mountPath) => {
    const backendRoute = backendRouteDetails[mountPath];
    const requestStats = summariseRequests(mountPath, requestOverview);
    const contractValidation = validateBackendContract(backendRoute);
    const sampleResponse = (requestOverview?.responseSamples || []).find(
      (entry) => entry.endpoint === mountPath
    );
    const dataQuality = validateSampleData(mountPath, sampleResponse);
    let status = 'idle';

    if (contractValidation.status === 'missing-required-fields' || contractValidation.status === 'renamed-fields-detected') {
      status = 'contract-mismatch';
    } else if (dataQuality.status === 'missing-values' || dataQuality.status === 'partial-data') {
      status = 'bad-data';
    } else if (requestStats.serverErrors > 0 || (requestStats.lastStatusCode >= 500)) {
      status = 'critical';
    } else if (requestStats.clientErrors > 0 || (requestStats.lastStatusCode >= 400 && requestStats.lastStatusCode < 500)) {
      status = 'warning';
    } else if (requestStats.total > 0) {
      status = 'healthy';
    }

    return {
      endpoint: mountPath,
      group: backendRoute?.group || 'unknown',
      moduleFile: backendRoute?.moduleFile ? path.relative(API_ROOT, backendRoute.moduleFile) : null,
      downstreamAiRefs: backendRoute?.aiRefs || [],
      requestStats,
      contractValidation,
      sampleResponse,
      dataQuality,
      status,
    };
  });
}

function buildAiLayer(aiRefs, aiStats, repositoryStatus) {
  return unique(aiRefs).map((aiRef) => {
    const matchedStats = matchAiStats(aiRef, aiStats);
    const totalCalls = matchedStats.reduce((sum, entry) => sum + (entry.calls || 0), 0);
    const failures = matchedStats.reduce((sum, entry) => sum + (entry.failures || 0), 0);
    const timeouts = matchedStats.reduce((sum, entry) => sum + (entry.timeouts || 0), 0);
    const lastFailureAt = matchedStats
      .map((entry) => entry.lastFailureAt)
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || null;

    let status = 'idle';
    if (repositoryStatus.ai?.status === 'not-running' || repositoryStatus.ai?.status === 'not-loaded') {
      status = 'warning';
    } else if (failures > 0 || timeouts > 0) {
      status = 'critical';
    } else if (totalCalls > 0) {
      status = 'healthy';
    }

    return {
      endpoint: aiRef,
      services: matchedStats.map((entry) => entry.service),
      totalCalls,
      failures,
      timeouts,
      lastFailureAt,
      recentErrors: matchedStats.flatMap((entry) =>
        (entry.recentErrors || []).map((error) => ({
          ...error,
          service: entry.service,
        }))
      ).slice(-8).reverse(),
      status,
    };
  });
}

function combineAiRefs(routeAiRefs, apiLayer) {
  return unique([
    ...routeAiRefs,
    ...apiLayer.flatMap((entry) => entry.downstreamAiRefs || []),
  ]);
}

function buildLayerHealth(route, apiLayer, aiLayer) {
  const frontendIssues = [];
  let frontendStatus = 'healthy';

  if (route.status === 'backend-mismatch') {
    frontendStatus = 'critical';
    frontendIssues.push(route.notes);
  } else if (route.status === 'empty-or-ui-only') {
    frontendStatus = 'warning';
    frontendIssues.push('No runtime integration was detected in the scanned component graph.');
  } else if (route.aiServices.length > 0 && route.backendApis.length === 0) {
    frontendStatus = 'healthy';
    frontendIssues.push('This route talks directly to NutriHelp-AI from the frontend.');
  }

  let apiStatus = 'not-applicable';
  const apiIssues = [];
  if (apiLayer.length > 0) {
    apiStatus = apiLayer.some((entry) => entry.status === 'contract-mismatch')
      ? 'contract-mismatch'
      : apiLayer.some((entry) => entry.status === 'bad-data')
        ? 'bad-data'
      : apiLayer.some((entry) => entry.status === 'critical')
        ? 'critical'
        : apiLayer.some((entry) => entry.status === 'warning')
          ? 'warning'
          : apiLayer.some((entry) => entry.status === 'healthy')
            ? 'healthy'
            : 'idle';

    apiLayer.forEach((entry) => {
      if (entry.status === 'contract-mismatch') {
        apiIssues.push(`${entry.endpoint} does not match the expected response contract.`);
      } else if (entry.status === 'bad-data') {
        apiIssues.push(`${entry.endpoint} returned a payload with missing or low-quality data fields.`);
      } else if (entry.status === 'critical') {
        apiIssues.push(`${entry.endpoint} returned server errors in the recent runtime snapshot.`);
      } else if (entry.status === 'warning') {
        apiIssues.push(`${entry.endpoint} has recent client-side failures or validation errors.`);
      }
    });
  }

  let aiStatus = 'not-applicable';
  const aiIssues = [];
  if (aiLayer.length > 0) {
    aiStatus = aiLayer.some((entry) => entry.status === 'critical')
      ? 'critical'
      : aiLayer.some((entry) => entry.status === 'warning')
        ? 'warning'
        : aiLayer.some((entry) => entry.status === 'healthy')
          ? 'healthy'
          : 'idle';

    aiLayer.forEach((entry) => {
      if (entry.status === 'critical') {
        aiIssues.push(`${entry.endpoint} has recent AI failures or timeouts.`);
      } else if (entry.status === 'warning') {
        aiIssues.push(`${entry.endpoint} is referenced, but the local AI runtime is unavailable.`);
      }
    });
  }

  return {
    frontend: {
      status: frontendStatus,
      issues: frontendIssues.filter(Boolean),
    },
    api: {
      status: apiStatus,
      issues: apiIssues,
    },
    ai: {
      status: aiStatus,
      issues: aiIssues,
    },
  };
}

function buildRouteFlow(route, backendRouteDetails, requestOverview, aiStats, repositoryStatus) {
  const apiLayer = buildApiLayer(route.backendRouteMatches, backendRouteDetails, requestOverview);
  const aiLayer = buildAiLayer(combineAiRefs(route.aiServices, apiLayer), aiStats, repositoryStatus);

  return {
    frontend: {
      route: route.frontendRoute,
      componentName: route.componentName,
      componentFile: route.componentFile,
      directApiRefs: route.backendApis,
      directAiRefs: route.aiServices,
    },
    api: apiLayer,
    ai: aiLayer,
  };
}

function inferRouteClassifications(route, flow, layerHealth, runtimeStartedAt) {
  const classifications = [];
  const now = Date.now();
  const runtimeAgeMs = runtimeStartedAt ? now - new Date(runtimeStartedAt).getTime() : 0;
  const hasTraffic = (route.activity?.totalApiRequests || 0) > 0 || (route.activity?.totalAiCalls || 0) > 0;

  if (route.aiServices.length > 0 && route.backendApis.length === 0) {
    classifications.push('direct-ai');
  }

  if (route.authMode === 'requires-auth' || route.authMode === 'requires-admin') {
    classifications.push('requires-auth');
  }

  if (layerHealth.api.status === 'contract-mismatch') {
    classifications.push('contract-mismatch');
  }

  if (['warning', 'critical', 'contract-mismatch'].includes(layerHealth.api.status)
    || ['warning', 'critical'].includes(layerHealth.ai.status)) {
    classifications.push('degraded');
  }

  if ((route.backendApis.length > 0 || route.aiServices.length > 0) && !hasTraffic && runtimeAgeMs >= STALE_ROUTE_THRESHOLD_MS) {
    classifications.push('stale');
  }

  if (route.status === 'backend-mismatch') {
    classifications.push('contract-mismatch');
  }

  return unique(classifications);
}

function determinePrimaryRouteStatus(route, classifications, layerHealth) {
  if (classifications.includes('contract-mismatch')) {
    return 'contract-mismatch';
  }
  if (layerHealth.api.status === 'bad-data') {
    return 'bad-data';
  }
  if (route.status === 'backend-mismatch') {
    return 'backend-mismatch';
  }
  if (classifications.includes('degraded')) {
    return 'degraded';
  }
  if (classifications.includes('direct-ai')) {
    return 'direct-ai';
  }
  if (classifications.includes('requires-auth') && route.backendApis.length > 0 && route.activity?.totalApiRequests === 0) {
    return 'requires-auth';
  }
  if (classifications.includes('stale')) {
    return 'stale';
  }
  return route.status;
}

function flattenRelatedFailures(flow, layerHealth) {
  const failures = [];

  layerHealth.frontend.issues.forEach((issue) => {
    failures.push({
      layer: 'frontend',
      status: layerHealth.frontend.status,
      message: issue,
      at: null,
    });
  });

  flow.api.forEach((entry) => {
    entry.requestStats.recent
      .filter((request) => Number(request.statusCode) >= 400)
      .forEach((request) => {
        failures.push({
          layer: 'api',
          status: entry.status,
          message: `${entry.endpoint} responded with ${request.statusCode}.`,
          at: request.at,
        });
      });
  });

  flow.ai.forEach((entry) => {
    entry.recentErrors.forEach((error) => {
      failures.push({
        layer: 'ai',
        status: entry.status,
        message: `${error.service || entry.endpoint}: ${error.message}`,
        at: error.at,
      });
    });
  });

  return failures
    .sort((left, right) => String(right.at || '').localeCompare(String(left.at || '')))
    .slice(0, 12);
}

function inferRecentErrorLayer(entry) {
  const text = [
    entry?.message,
    entry?.error_message,
    entry?.type,
    entry?.category,
    entry?.code,
    entry?.additionalContext && JSON.stringify(entry.additionalContext),
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('ai') || text.includes('python') || text.includes('chatbot') || text.includes('medical-report')) {
    return 'ai';
  }

  return 'api';
}

function buildWebAudit(repositories, backendRoutes, backendRouteDetails, requestOverview, aiStats, runtimeStartedAt) {
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

    const routeSummary = {
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

    const flow = buildRouteFlow(routeSummary, backendRouteDetails, requestOverview, aiStats, repositories);
    const layerHealth = buildLayerHealth(routeSummary, flow.api, flow.ai);
    const activity = {
      totalApiRequests: flow.api.reduce((sum, entry) => sum + (entry.requestStats.total || 0), 0),
      lastApiActivityAt: flow.api
        .map((entry) => entry.requestStats.lastCalledAt)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || null,
      totalAiCalls: flow.ai.reduce((sum, entry) => sum + (entry.totalCalls || 0), 0),
      lastAiFailureAt: flow.ai
        .map((entry) => entry.lastFailureAt)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || null,
    };
    const routeWithActivity = {
      ...routeSummary,
      activity,
      authMode: route.authMode,
    };
    const classifications = inferRouteClassifications(routeWithActivity, flow, layerHealth, runtimeStartedAt);
    const primaryStatus = determinePrimaryRouteStatus(routeWithActivity, classifications, layerHealth);

    return {
      ...routeWithActivity,
      flow,
      layerHealth,
      classifications,
      status: primaryStatus,
      contractValidation: {
        backend: flow.api.map((entry) => ({
          endpoint: entry.endpoint,
          ...entry.contractValidation,
        })),
      },
      relatedFailures: flattenRelatedFailures(flow, layerHealth),
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
  const runtime = getSnapshot();
  const aiStats = aiServiceMonitor.getStats();
  const backendRouteDetails = buildBackendRouteDetails(backendRoutes);
  const webAudit = buildWebAudit(
    repositoryStatus,
    backendRoutes,
    backendRouteDetails,
    runtime.requests,
    aiStats,
    runtime.startedAt
  );
  const errorHealth = await errorLogService.healthCheck();
  const recentErrors = getRecentErrors().map((entry) => ({
    ...entry,
    layer: inferRecentErrorLayer(entry),
  }));

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
      directAiRoutes: webAudit.routes.filter((route) => route.classifications.includes('direct-ai')).length,
      degradedRoutes: webAudit.routes.filter((route) => route.classifications.includes('degraded')).length,
      requiresAuthRoutes: webAudit.routes.filter((route) => route.classifications.includes('requires-auth')).length,
      contractMismatchRoutes: webAudit.routes.filter((route) => route.classifications.includes('contract-mismatch')).length,
      badDataRoutes: webAudit.routes.filter((route) => route.flow.api.some((entry) => entry.dataQuality?.status === 'missing-values' || entry.dataQuality?.status === 'partial-data')).length,
      staleRoutes: webAudit.routes.filter((route) => route.classifications.includes('stale')).length,
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
