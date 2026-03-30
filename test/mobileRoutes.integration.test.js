const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

function getRouteLayer(router, path, method) {
  return router.stack.find((layer) =>
    layer.route &&
    layer.route.path === path &&
    layer.route.methods[method] === true,
  );
}

describe("mobile routes integration", () => {
  let controller;
  let authenticateToken;
  let router;

  beforeEach(() => {
    controller = {
      register: sinon.stub(),
      login: sinon.stub(),
      refreshToken: sinon.stub(),
      logout: sinon.stub(),
      getMe: sinon.stub(),
      getMyNotifications: sinon.stub(),
      getMyMealPlans: sinon.stub(),
      getRecommendations: sinon.stub(),
      getHomeSummary: sinon.stub(),
    };

    authenticateToken = sinon.stub();

    router = proxyquire("../routes/mobile", {
      "../controller/mobileController": controller,
      "../middleware/authenticateToken": { authenticateToken },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("registers unauthenticated auth routes", () => {
    const loginLayer = getRouteLayer(router, "/auth/login", "post");
    const registerLayer = getRouteLayer(router, "/auth/register", "post");
    const refreshLayer = getRouteLayer(router, "/auth/refresh", "post");
    const logoutLayer = getRouteLayer(router, "/auth/logout", "post");

    expect(loginLayer).to.not.equal(undefined);
    expect(registerLayer).to.not.equal(undefined);
    expect(refreshLayer).to.not.equal(undefined);
    expect(logoutLayer).to.not.equal(undefined);

    expect(loginLayer.route.stack).to.have.length(1);
    expect(loginLayer.route.stack[0].handle).to.equal(controller.login);
    expect(registerLayer.route.stack[0].handle).to.equal(controller.register);
    expect(refreshLayer.route.stack[0].handle).to.equal(controller.refreshToken);
    expect(logoutLayer.route.stack[0].handle).to.equal(controller.logout);
  });

  it("protects GET /me with authenticateToken", () => {
    const layer = getRouteLayer(router, "/me", "get");

    expect(layer).to.not.equal(undefined);
    expect(layer.route.stack).to.have.length(2);
    expect(layer.route.stack[0].handle).to.equal(authenticateToken);
    expect(layer.route.stack[1].handle).to.equal(controller.getMe);
  });

  it("protects notifications, meal plans, recommendations, and home summary", () => {
    const protectedRoutes = [
      ["/notifications", "get", controller.getMyNotifications],
      ["/meal-plans", "get", controller.getMyMealPlans],
      ["/recommendations", "post", controller.getRecommendations],
      ["/home-summary", "post", controller.getHomeSummary],
    ];

    for (const [path, method, handler] of protectedRoutes) {
      const layer = getRouteLayer(router, path, method);
      expect(layer, `${method.toUpperCase()} ${path}`).to.not.equal(undefined);
      expect(layer.route.stack[0].handle, `${method.toUpperCase()} ${path} middleware`).to.equal(authenticateToken);
      expect(layer.route.stack[1].handle, `${method.toUpperCase()} ${path} handler`).to.equal(handler);
    }
  });
});
