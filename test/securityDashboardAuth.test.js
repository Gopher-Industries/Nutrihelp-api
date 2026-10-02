const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

describe("Security Dashboard authentication", () => {
  it("protects the dashboard route with authenticateToken", () => {
    const authenticateToken = sinon.stub();
    const getSecurityDashboard = sinon.stub();

    const router = proxyquire("../routes/securityDashboard", {
      "../middleware/authenticateToken": { authenticateToken },
      "../controller/securityDashboardController": { getSecurityDashboard },
    });

    const dashboardRoute = router.stack.find(
      (layer) => layer.route && layer.route.path === "/"
    );

    expect(dashboardRoute).to.exist;

    const handlers = dashboardRoute.route.stack.map(
      (layer) => layer.handle
    );

    expect(handlers).to.include(authenticateToken);
    expect(handlers).to.include(getSecurityDashboard);
    expect(handlers.indexOf(authenticateToken)).to.be.lessThan(
      handlers.indexOf(getSecurityDashboard)
    );
  });

  it("protects security scanner API routes with authenticateToken", () => {
    const authenticateToken = sinon.stub();

    const router = proxyquire("../routes/securityScanner", {
      "../middleware/authenticateToken": { authenticateToken },
      "../controller/securityScannerController": {
        getScanResults: sinon.stub(),
        getScanHistory: sinon.stub(),
        getHistoricalScan: sinon.stub(),
      },
      "../controller/securityScanController": {
        runScan: sinon.stub(),
        getRules: sinon.stub(),
      },
    });

    const authLayer = router.stack.find(
      (layer) => layer.handle === authenticateToken
    );

    expect(authLayer).to.exist;
  });
});