#!/usr/bin/env node
/**
 * check-route-guards.js
 *
 * Fails when an Express write route (POST, PUT, PATCH, DELETE) is registered
 * without recognised authentication or authorisation middleware.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three entries in the NutriHelp vulnerability register share one root cause:
 * a new route file was created and the security middleware that protects
 * comparable routes was not applied to it. NH-VULN-2026-012 (security scanner
 * results), NH-VULN-2026-013 (community posts and comments) and
 * NH-VULN-2026-017 (Health News create, update and delete, found independently
 * by AppAttack). In every case the correct pattern already existed elsewhere in
 * this codebase, sometimes in the same file.
 *
 * Fixing three routes closes three symptoms. It does not stop the fourth.
 * This check does, by making the absence of a guard a build failure rather than
 * something a reviewer has to notice.
 *
 * WHY IT PARSES RATHER THAN GREPS
 * -------------------------------
 * The first version of that register entry list contained a false positive.
 * Two routes in systemRoutes.js were reported as unauthenticated because their
 * definitions carry no inline middleware. They are in fact protected, by
 * router.use(authenticateToken) and router.use(authorizeRoles('admin')) applied
 * earlier in the same file. Reading route definitions in isolation produced a
 * confident and wrong answer.
 *
 * So this walks the AST in source order and tracks router-level middleware as
 * it goes, exactly as Express itself does. A grep cannot do that, and a grep is
 * how the mistake happened.
 *
 * FAIL-SAFE DESIGN
 * ----------------
 * Every uncertain outcome fails rather than passes:
 *   - a file that will not parse            -> exit 2, never skipped
 *   - no route files found                  -> exit 2, the walker is broken
 *   - no write routes found anywhere        -> exit 2, the walker is broken
 *   - middleware this script does not know  -> treated as NOT a guard
 *   - an allowlist entry that matches no    -> exit 1, so exemptions cannot
 *     current route                            outlive the route they excuse
 *
 * Exit codes:  0 clean   1 policy violation   2 the check could not run
 *
 * Usage:  node scripts/check-route-guards.js [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

let acorn;
try {
  acorn = require('acorn');
} catch (err) {
  console.error('ERROR: acorn is not installed. The check did NOT run.');
  console.error('A check that cannot run is not a pass. Install dev dependencies.');
  process.exit(2);
}

const REPO = path.resolve(__dirname, '..');
const ROUTES_DIR = path.join(REPO, 'routes');
const ALLOWLIST_FILE = path.join(__dirname, 'route-guard-allowlist.json');

/**
 * Routes that were already unprotected when this check was introduced.
 *
 * The difference between this and the allowlist matters. An allowlist entry
 * says "this route is meant to be open, here is why". A baseline entry says
 * "this route needs fixing and nobody has fixed it yet". The baseline exists so
 * that introducing the check does not turn every open pull request red for debt
 * that predates it, which would get the check switched off within a day.
 *
 * The check therefore fails on NEW unprotected routes only. Existing ones are
 * reported every run so they stay visible, and the list should shrink to empty.
 */
const BASELINE_FILE = path.join(__dirname, 'route-guard-baseline.json');

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/**
 * A route whose path is built at runtime rather than written as a string.
 * The guard analysis is still valid for these, but the path cannot be used as a
 * stable allowlist key, so they can never be exempted. That is intentional.
 */
const UNKNOWN_PATH = '<computed path>';

/**
 * Middleware that actually establishes identity or privilege in this codebase.
 * Anything not on this list is not treated as protection. That is deliberate:
 * an unknown name is an unknown guarantee, so the check fails closed.
 * Adding a name here is a security decision and should be reviewed as one.
 */
const GUARDS = new Set([
  'authenticateToken',          // middleware/authenticateToken.js
  'authenticateAIToken',        // middleware/authenticateAIToken.js
  'authorizeRoles',             // middleware/authorizeRoles.js
  'authorizeAdminOrRecovery',   // locally defined in routes/systemRoutes.js
]);

const problems = [];
const fatal = (msg) => { console.error(`ERROR: ${msg}`); process.exit(2); };

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

/** Throws on bad syntax. Kept separate from parse() so tests can assert it throws. */
function parseSource(src) {
  return acorn.parse(src, {
    ecmaVersion: 'latest',
    sourceType: 'script',
    locations: true,
    allowReturnOutsideFunction: true,
  });
}

function parse(file) {
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch (err) {
    fatal(`cannot read ${path.relative(REPO, file)}: ${err.message}`);
  }
  try {
    return parseSource(src);
  } catch (err) {
    fatal(
      `cannot parse ${path.relative(REPO, file)} at line ${err.loc ? err.loc.line : '?'}: ` +
      `${err.message}\n       The file was NOT checked. This is not a clean result.`
    );
  }
}

/** Names that an argument could contribute, e.g. authorizeRoles('admin') -> authorizeRoles */
function namesOf(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier':
      out.push(node.name); break;
    case 'CallExpression':
      namesOf(node.callee, out); break;
    case 'MemberExpression':
      namesOf(node.object, out);
      if (node.property && node.property.type === 'Identifier') out.push(node.property.name);
      break;
    case 'ArrayExpression':
      node.elements.forEach((el) => namesOf(el, out)); break;
    case 'LogicalExpression':
    case 'ConditionalExpression':
      ['left', 'right', 'consequent', 'alternate'].forEach((k) => namesOf(node[k], out));
      break;
    default: break;
  }
  return out;
}

/** router.post(...) / app.post(...) -> {object, method} */
function callTarget(node) {
  if (node.type !== 'CallExpression') return null;
  const c = node.callee;
  if (!c || c.type !== 'MemberExpression') return null;
  if (!c.property || c.property.type !== 'Identifier') return null;
  const obj = c.object && c.object.type === 'Identifier' ? c.object.name : null;
  return { object: obj, method: c.property.name };
}

function literalPath(node) {
  return node && node.type === 'Literal' && typeof node.value === 'string' ? node.value : null;
}

/**
 * Does `routePath` fall under a `router.use(prefix, mw)` mount?
 *
 * Express matches a use() prefix on a path SEGMENT boundary: router.use('/admin')
 * covers /admin and /admin/anything, and does NOT cover /adminsettings. A plain
 * startsWith treats /adminsettings as covered, so an unprotected route inherits a
 * guard it never actually runs and the check reports it as protected.
 *
 * That is the fail-open direction, which is the one that matters here: a false
 * positive wastes a reviewer's time, a false negative is a route nobody looks at
 * again. Raised in review by James Nardella on PR #311.
 */
function pathUnderPrefix(routePath, prefix) {
  if (typeof routePath !== 'string' || typeof prefix !== 'string') return false;
  const p = prefix.replace(/\/+$/, '');
  if (p === '') return true;                  // router.use('/') covers everything
  return routePath === p || routePath.startsWith(`${p}/`);
}

/**
 * Express accepts two forms for the same thing:
 *
 *   router.delete('/v2/:id', authenticateToken, handler)     path is argument 0
 *   router.route('/v2/:id').delete(authenticateToken, handler)   path is on .route()
 *
 * and the second form chains:  router.route('/x').put(...).delete(...)
 *
 * An earlier version of this script only understood the first. On the second it
 * read the first middleware as if it were the path, then looked for guards in
 * what was left, and reported protected routes as unprotected. That is the same
 * failure mode as reading a route definition without its router-level guards:
 * confident, specific and wrong. Both forms are resolved here.
 *
 * Returns { path, argStart, root } or null when this is not an HTTP method call
 * on a router. `root` is the identifier the chain is rooted at, so a call on some
 * unrelated object is not mistaken for a route.
 */
function resolveRouteCall(node, depth = 0) {
  if (depth > 16) return null;                 // absurd chain, fail closed below
  const t = callTarget(node);
  if (!t) return null;

  const obj = node.callee.object;

  // router.route('/x')  -> the base of a chain
  if (obj && obj.type === 'CallExpression') {
    const inner = callTarget(obj);
    if (inner && inner.method === 'route' && inner.object) {
      return { path: literalPath(obj.arguments[0]), argStart: 0, root: inner.object, method: t.method };
    }
    // .put(...).delete(...)  -> walk down to the base
    const base = resolveRouteCall(obj, depth + 1);
    if (base) return { path: base.path, argStart: 0, root: base.root, method: t.method };
    return null;
  }

  // router.post('/x', ...)
  if (t.object) return { path: literalPath(node.arguments[0]), argStart: 1, root: t.object, method: t.method };

  return null;
}

// ---------------------------------------------------------------------------
// Mount-level middleware, from routes/index.js and server.js
// ---------------------------------------------------------------------------

/**
 * Builds  { 'routes/community.js': ['authenticateToken', ...] }  for any router
 * mounted with middleware at the application level. A router protected at its
 * mount point is protected, and missing that would produce false positives.
 */
function collectMountMiddleware() {
  const map = new Map();
  const files = ['routes/index.js', 'server.js']
    .map((f) => path.join(REPO, f))
    .filter((f) => fs.existsSync(f));

  if (files.length === 0) {
    fatal('neither routes/index.js nor server.js was found. Cannot establish mount context.');
  }

  for (const file of files) {
    const ast = parse(file);
    walk(ast, (node) => {
      const t = callTarget(node);
      if (!t || t.method !== 'use') return;
      const args = node.arguments || [];
      if (args.length < 2) return;

      // The mounted router is usually the last argument: require('./community')
      const last = args[args.length - 1];
      let required = null;
      if (last.type === 'CallExpression' && last.callee.type === 'Identifier'
          && last.callee.name === 'require') {
        required = literalPath(last.arguments[0]);
      }
      if (!required) return;

      // Anything between the path and the router is middleware.
      const mws = [];
      for (let i = 1; i < args.length - 1; i++) mws.push(...namesOf(args[i]));
      if (mws.length === 0) return;

      const resolved = path.relative(
        REPO,
        path.resolve(path.dirname(file), required)
      ).replace(/\\/g, '/');
      const key = resolved.endsWith('.js') ? resolved : `${resolved}.js`;
      map.set(key, (map.get(key) || []).concat(mws));
    });
  }
  return map;
}

/** Depth-first walk over every node with a type. */
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => walk(c, fn));
    else if (child && typeof child === 'object' && child.type) walk(child, fn);
  }
}

// ---------------------------------------------------------------------------
// Route file analysis
// ---------------------------------------------------------------------------

function listRouteFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listRouteFiles(full));
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/**
 * Walks a route file's top-level statements IN ORDER, accumulating router-level
 * middleware from router.use(...) as Express would, then evaluates each write
 * route against everything in scope at the point it is registered.
 */
function analyseFile(file, mountMiddleware) {
  const rel = path.relative(REPO, file).replace(/\\/g, '/');
  return analyseAst(rel, parse(file), mountMiddleware.get(rel) || []);
}

/** Same analysis over a source string. Used by the tests. */
function analyseSource(rel, src, mountMws = []) {
  return analyseAst(rel, parseSource(src), mountMws);
}

function analyseAst(rel, ast, mountMws) {

  const globalUse = [];                    // pathless router.use(mw)
  const scopedUse = [];                    // { prefix, mws } from router.use('/x', mw)
  const found = [];

  for (const stmt of ast.body) {
    // router.use(...) at statement level updates what is in scope from here on.
    const expr = stmt.type === 'ExpressionStatement' ? stmt.expression : null;
    const t = expr ? callTarget(expr) : null;
    if (t && t.method === 'use' && t.object) {
      const args = expr.arguments || [];
      const first = literalPath(args[0]);
      const mws = [];
      const start = first === null ? 0 : 1;
      for (let i = start; i < args.length; i++) mws.push(...namesOf(args[i]));
      if (first === null) globalUse.push(...mws);
      else scopedUse.push({ prefix: first, mws });
      continue;
    }

    // Everything else: find every HTTP method call inside the statement, which
    // covers both router.post(path, ...) and router.route(path).post(...) and
    // any chaining of the latter.
    const routerLevelSnapshot = [...globalUse];
    const scopedSnapshot = scopedUse.map((s) => ({ ...s }));

    walk(stmt, (node) => {
      if (node.type !== 'CallExpression') return;
      const r = resolveRouteCall(node);
      if (!r || !WRITE_METHODS.has(r.method)) return;

      const args = node.arguments || [];
      const inline = [];
      for (let i = r.argStart; i < args.length; i++) inline.push(...namesOf(args[i]));

      const scoped = scopedSnapshot
        .filter((s) => pathUnderPrefix(r.path, s.prefix))
        .flatMap((s) => s.mws);

      const inScope = [...inline, ...routerLevelSnapshot, ...scoped, ...mountMws];
      const guards = inScope.filter((n) => GUARDS.has(n));

      found.push({
        file: rel,
        line: node.loc.start.line,
        method: r.method.toUpperCase(),
        path: r.path === null ? UNKNOWN_PATH : r.path,
        guards,
        protectedBy: guards.length > 0,
        // Recorded so a reviewer can see what the check considered, not just its verdict.
        sawInline: inline,
        sawRouterLevel: [...routerLevelSnapshot, ...scoped],
        sawMount: mountMws,
      });
    });
  }
  found.sort((a, b) => a.line - b.line);
  return found;
}

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_FILE)) return [];
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, 'utf8'));
  } catch (err) {
    fatal(`${path.relative(REPO, ALLOWLIST_FILE)} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(raw)) fatal('allowlist must be a JSON array.');
  raw.forEach((e, i) => {
    for (const k of ['file', 'method', 'path', 'reason']) {
      if (!e[k] || typeof e[k] !== 'string') {
        fatal(`allowlist entry ${i} is missing a string "${k}". Every exemption needs a reason.`);
      }
    }
  });
  return raw;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return [];
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch (err) {
    fatal(`${path.relative(REPO, BASELINE_FILE)} is not valid JSON: ${err.message}`);
  }
  if (!Array.isArray(raw)) fatal('baseline must be a JSON array.');
  raw.forEach((e, i) => {
    for (const k of ['file', 'method', 'path']) {
      if (!e[k] || typeof e[k] !== 'string') {
        fatal(`baseline entry ${i} is missing a string "${k}".`);
      }
    }
  });
  return raw;
}

const keyOf = (r) => `${r.file} ${r.method} ${r.path}`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const asJson = process.argv.includes('--json');

  if (!fs.existsSync(ROUTES_DIR)) fatal(`routes directory not found at ${ROUTES_DIR}`);

  const files = listRouteFiles(ROUTES_DIR);
  if (files.length === 0) fatal('no route files found. The check did NOT run.');

  const mountMiddleware = collectMountMiddleware();

  let routes = [];
  for (const f of files) routes = routes.concat(analyseFile(f, mountMiddleware));

  if (routes.length === 0) {
    fatal(
      `parsed ${files.length} route files and found no write routes at all. ` +
      `The walker is broken, not the codebase. This is not a clean result.`
    );
  }

  const allowlist = loadAllowlist();
  const allowByKey = new Map(allowlist.map((e) => [`${e.file} ${e.method} ${e.path}`, e]));

  const baseline = loadBaseline();
  const baseKeys = new Set(baseline.map((e) => `${e.file} ${e.method} ${e.path}`));

  const unprotected = routes.filter((r) => !r.protectedBy);
  const exempted = unprotected.filter((r) => allowByKey.has(keyOf(r)));
  const notExempt = unprotected.filter((r) => !allowByKey.has(keyOf(r)));

  // Known debt, reported but not fatal. New ones fail the build.
  const known = notExempt.filter((r) => baseKeys.has(keyOf(r)));
  const violations = notExempt.filter((r) => !baseKeys.has(keyOf(r)));

  // A baseline entry with no matching route means somebody fixed it. Good news,
  // so it is reported rather than failed, with a prompt to trim the list.
  const liveUnprotected = new Set(notExempt.map(keyOf));
  const fixedSinceBaseline = baseline.filter(
    (e) => !liveUnprotected.has(`${e.file} ${e.method} ${e.path}`)
  );

  // A stale exemption is a failure. Otherwise an allowlist entry silently
  // outlives the route it was written for and quietly covers a future one.
  const liveKeys = new Set(routes.map(keyOf));
  const stale = allowlist.filter((e) => !liveKeys.has(`${e.file} ${e.method} ${e.path}`));

  if (asJson) {
    console.log(JSON.stringify(
      { routes, violations, known, exempted, stale, fixedSinceBaseline }, null, 2));
  } else {
    console.log('='.repeat(72));
    console.log('Route guard check');
    console.log('='.repeat(72));
    console.log(`Route files parsed   : ${files.length}`);
    console.log(`Write routes found   : ${routes.length}`);
    console.log(`Protected            : ${routes.length - unprotected.length}`);
    console.log(`Exempted, with reason: ${exempted.length}`);
    console.log(`Known, in baseline   : ${known.length}   (reported, does not fail the build)`);
    console.log(`NEW violations       : ${violations.length}`);
    console.log('');

    if (known.length) {
      console.log('Known unprotected routes, carried in the baseline:');
      for (const r of known) {
        console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(32)} ${r.file}:${r.line}`);
      }
      console.log('');
      console.log('  These predate this check. Fix them or give them a reasoned exemption,');
      console.log('  then remove them from scripts/route-guard-baseline.json.');
      console.log('');
    }

    if (fixedSinceBaseline.length) {
      console.log('Fixed since the baseline was taken, please remove from the baseline:');
      for (const e of fixedSinceBaseline) console.log(`  ${e.method} ${e.path} in ${e.file}`);
      console.log('');
    }

    if (exempted.length) {
      console.log('Exempted by allowlist:');
      for (const r of exempted) {
        console.log(`  ${r.method.padEnd(6)} ${r.path.padEnd(34)} ${r.file}:${r.line}`);
        console.log(`         reason: ${allowByKey.get(keyOf(r)).reason}`);
      }
      console.log('');
    }

    if (stale.length) {
      console.log('STALE ALLOWLIST ENTRIES, these no longer match any route:');
      for (const e of stale) console.log(`  ${e.method} ${e.path} in ${e.file}`);
      console.log('');
    }

    if (violations.length) {
      console.log('NEW UNPROTECTED WRITE ROUTES, these fail the build:');
      for (const r of violations) {
        console.log('');
        console.log(`  ${r.file}:${r.line}`);
        console.log(`    ${r.method} ${r.path}`);
        console.log(`    inline middleware      : ${r.sawInline.join(', ') || 'none'}`);
        console.log(`    router-level middleware: ${r.sawRouterLevel.join(', ') || 'none'}`);
        console.log(`    mount-level middleware : ${r.sawMount.join(', ') || 'none'}`);
        console.log(`    recognised guards      : none`);
      }
      console.log('');
      console.log('Add a guard, or add a reasoned exemption to');
      console.log(`  ${path.relative(REPO, ALLOWLIST_FILE)}`);
    }
  }

  if (stale.length) {
    if (!asJson) console.log('\nFAIL: allowlist contains entries that match no current route.');
    process.exit(1);
  }
  if (violations.length) {
    if (!asJson) console.log(`\nFAIL: ${violations.length} NEW unprotected write route(s) added.`);
    process.exit(1);
  }
  if (!asJson) {
    console.log(
      known.length
        ? `PASS: no new unprotected routes. ${known.length} known one(s) still to clear.`
        : 'PASS: every write route carries a recognised guard or a reasoned exemption.'
    );
  }
  process.exit(0);
}

if (require.main === module) main();

// Exported so the behaviour can be tested directly rather than only through the
// exit code. test/routeGuardCheck.test.js asserts each fail-safe path.
module.exports = {
  analyseSource,
  parseSource,
  namesOf,
  resolveRouteCall,
  pathUnderPrefix,
  GUARDS,
  WRITE_METHODS,
  UNKNOWN_PATH,
};
