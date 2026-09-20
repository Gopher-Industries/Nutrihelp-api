const { expect } = require("chai");
const { execFileSync } = require("child_process");
const path = require("path");

const {
  analyseSource,
  parseSource,
  pathUnderPrefix,
  UNKNOWN_PATH,
} = require("../scripts/check-route-guards");

const SCRIPT = path.join(__dirname, "..", "scripts", "check-route-guards.js");

/** Run the checker end to end and return { code, stdout }. */
function run(args = []) {
  try {
    const stdout = execFileSync("node", [SCRIPT, ...args], { encoding: "utf8" });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: (err.stdout || "") + (err.stderr || "") };
  }
}

const only = (rs) => { expect(rs).to.have.lengthOf(1); return rs[0]; };

describe("route guard check: recognising protection", () => {
  it("accepts a guard declared inline on the route", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/thing', authenticateToken, ctrl.create);`));
    expect(r.protectedBy).to.equal(true);
    expect(r.guards).to.deep.equal(["authenticateToken"]);
  });

  it("accepts a guard applied earlier by router.use, which is the case a manual review got wrong", () => {
    // NH-VULN-2026-002 was raised because these two lines were read in isolation.
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use(authenticateToken);
       router.use(authorizeRoles('admin'));
       router.post('/generate-baseline', (req, res) => {});`));
    expect(r.protectedBy).to.equal(true);
    expect(r.guards).to.include.members(["authenticateToken", "authorizeRoles"]);
  });

  it("does NOT apply a router.use that comes after the route", () => {
    // Express applies middleware in registration order. So must this.
    const rs = analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/early', ctrl.create);
       router.use(authenticateToken);
       router.post('/late', ctrl.create);`);
    expect(rs.find((r) => r.path === "/early").protectedBy).to.equal(false);
    expect(rs.find((r) => r.path === "/late").protectedBy).to.equal(true);
  });

  it("accepts a guard on the chained router.route(path).method(...) form", () => {
    // An earlier version read the first middleware as if it were the path and
    // reported this protected route as unprotected.
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.route('/v2/:id').delete(authenticateToken, ctrl.remove);`));
    expect(r.path).to.equal("/v2/:id");
    expect(r.protectedBy).to.equal(true);
  });

  it("handles a chain of several methods on one route", () => {
    const rs = analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.route('/v2/:id')
         .put(authenticateToken, ctrl.update)
         .delete(authenticateToken, ctrl.remove);`);
    expect(rs).to.have.lengthOf(2);
    expect(rs.every((r) => r.protectedBy && r.path === "/v2/:id")).to.equal(true);
  });

  it("accepts a guard applied at the mount point", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/thing', ctrl.create);`,
      ["authenticateToken"]));
    expect(r.protectedBy).to.equal(true);
  });

  it("applies a path-scoped router.use only to matching paths", () => {
    const rs = analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin', authorizeRoles('admin'));
       router.post('/admin/purge', ctrl.purge);
       router.post('/public/ping', ctrl.ping);`);
    expect(rs.find((r) => r.path === "/admin/purge").protectedBy).to.equal(true);
    expect(rs.find((r) => r.path === "/public/ping").protectedBy).to.equal(false);
  });
});

describe("route guard check: router.use path prefixes", () => {
  // Raised in review by James Nardella on PR #311. A plain startsWith would let
  // /adminsettings inherit the guard mounted at /admin, which is fail-open: an
  // unprotected route would be reported as protected and nobody would look again.

  it("applies a prefixed guard to the prefix itself", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin', authenticateToken);
       router.post('/admin', ctrl.create);`));
    expect(r.protectedBy).to.equal(true);
  });

  it("applies a prefixed guard to paths below the prefix", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin', authenticateToken);
       router.post('/admin/users/:id', ctrl.create);`));
    expect(r.protectedBy).to.equal(true);
  });

  it("does NOT apply a prefixed guard to a similarly prefixed sibling", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin', authenticateToken);
       router.post('/adminsettings', ctrl.create);`));
    expect(r.protectedBy).to.equal(false);
    expect(r.guards).to.deep.equal([]);
  });

  it("ignores a trailing slash on the prefix", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin/', authenticateToken);
       router.post('/adminsettings', ctrl.create);`));
    expect(r.protectedBy).to.equal(false);
  });

  it("treats a guard mounted at / as covering everything", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/', authenticateToken);
       router.post('/anything', ctrl.create);`));
    expect(r.protectedBy).to.equal(true);
  });

  it("does not let a runtime-built path inherit a prefixed guard", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.use('/admin', authenticateToken);
       router.post(BASE + '/thing', ctrl.create);`));
    expect(r.path).to.equal(UNKNOWN_PATH);
    expect(r.protectedBy).to.equal(false);
  });

  describe("pathUnderPrefix directly", () => {
    const cases = [
      ["/admin",            "/admin",   true],
      ["/admin/",           "/admin",   true],
      ["/admin/users",      "/admin",   true],
      ["/admin/users/:id",  "/admin",   true],
      ["/adminsettings",    "/admin",   false],
      ["/admin-settings",   "/admin",   false],
      ["/adm",              "/admin",   false],
      ["/anything",         "/",        true],
      ["/admin/users",      "/admin/",  true],
      [null,                "/admin",   false],
    ];
    for (const [route, prefix, want] of cases) {
      it(`${JSON.stringify(route)} under ${JSON.stringify(prefix)} -> ${want}`, () => {
        expect(pathUnderPrefix(route, prefix)).to.equal(want);
      });
    }
  });
});

describe("route guard check: failing closed", () => {
  it("does not treat an unrecognised middleware as protection", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/thing', someCustomThing, validate, ctrl.create);`));
    expect(r.protectedBy).to.equal(false);
    expect(r.sawInline).to.include("someCustomThing");
  });

  it("does not treat a validator as protection", () => {
    // Validators check shape, not identity. NH-VULN-2026-013 turned on exactly
    // this distinction.
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/posts', createPostValidator, sanitizeInput, ctrl.create);`));
    expect(r.protectedBy).to.equal(false);
  });

  it("flags every write verb, not just POST", () => {
    const rs = analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post('/a', ctrl.a);
       router.put('/b', ctrl.b);
       router.patch('/c', ctrl.c);
       router.delete('/d', ctrl.d);`);
    expect(rs).to.have.lengthOf(4);
    expect(rs.every((r) => !r.protectedBy)).to.equal(true);
  });

  it("ignores read routes", () => {
    expect(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.get('/thing', ctrl.read);`)).to.have.lengthOf(0);
  });

  it("marks a computed path as unknown so it can never be allowlisted", () => {
    const r = only(analyseSource("routes/x.js",
      `const router = require('express').Router();
       router.post(PATHS.thing, ctrl.create);`));
    expect(r.path).to.equal(UNKNOWN_PATH);
  });

  it("refuses to parse a broken file rather than skipping it", () => {
    expect(() => parseSource("router.post('/x', ;")).to.throw();
  });
});

describe("route guard check: end to end", () => {
  it("runs against this repository and reports a non-zero count of routes", () => {
    const { stdout } = run(["--json"]);
    const out = JSON.parse(stdout);
    expect(out.routes.length).to.be.greaterThan(0);
  });

  it("passes on the current tree, because known debt is baselined", () => {
    // The baseline exists so that introducing this check does not turn every
    // open pull request red for routes that predate it.
    const { code } = run();
    expect(code).to.equal(0);
  });

  it("still fails when a NEW unprotected route appears", () => {
    const fs = require("fs");
    const path = require("path");
    const tmp = path.join(__dirname, "..", "routes", "__guardcheck_tmp.js");
    fs.writeFileSync(tmp,
      "const router = require('express').Router();\n" +
      "router.post('/guardcheck-tmp', (req, res) => res.json({}));\n" +
      "module.exports = router;\n");
    try {
      const { code, stdout } = run();
      expect(code, "a new unprotected route must fail the build").to.equal(1);
      expect(stdout).to.contain("/guardcheck-tmp");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("every baseline entry still matches a real unprotected route", () => {
    const { stdout } = run(["--json"]);
    expect(JSON.parse(stdout).fixedSinceBaseline).to.deep.equal([]);
  });

  it("every allowlist entry carries a reason", () => {
    const list = require("../scripts/route-guard-allowlist.json");
    expect(list.length).to.be.greaterThan(0);
    for (const e of list) {
      expect(e.reason, `${e.method} ${e.path}`).to.be.a("string");
      expect(e.reason.length, `${e.method} ${e.path}`).to.be.greaterThan(20);
    }
  });

  it("no allowlist entry is stale", () => {
    const { stdout } = run(["--json"]);
    expect(JSON.parse(stdout).stale).to.deep.equal([]);
  });
});
