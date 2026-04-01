const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe("mobileController", () => {
  let mobileAuthService;
  let mobileProfileService;
  let mobileNotificationService;
  let mobileMealPlanService;
  let mobileRecommendationService;
  let mobileHomeService;
  let controller;

  beforeEach(() => {
    mobileAuthService = {
      registerMobileUser: sinon.stub(),
      loginMobileUser: sinon.stub(),
      refreshMobileSession: sinon.stub(),
      logoutMobileSession: sinon.stub(),
    };

    mobileProfileService = {
      getProfileByEmail: sinon.stub(),
    };
    mobileNotificationService = {
      getNotificationSummary: sinon.stub(),
    };
    mobileMealPlanService = {
      getMealPlansByUserId: sinon.stub(),
    };
    mobileRecommendationService = {
      generateMobileRecommendations: sinon.stub(),
    };
    mobileHomeService = {
      getHomeSummary: sinon.stub(),
    };

    controller = proxyquire("../controller/mobileController", {
      "../services/mobile/mobileAuthService": mobileAuthService,
      "../services/mobile/mobileProfileService": mobileProfileService,
      "../services/mobile/mobileNotificationService": mobileNotificationService,
      "../services/mobile/mobileMealPlanService": mobileMealPlanService,
      "../services/mobile/mobileRecommendationService": mobileRecommendationService,
      "../services/mobile/mobileHomeService": mobileHomeService,
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("returns a mobile-friendly envelope for login", async () => {
    const req = {
      body: {
        email: "mobile@example.com",
        password: "Password123!",
      },
      ip: "127.0.0.1",
      get(header) {
        const headers = {
          "user-agent": "ios-app/1.0",
          "x-device-id": "device-1",
          "x-client-type": "mobile",
        };
        return headers[header.toLowerCase()];
      },
    };
    const res = createResponse();

    mobileAuthService.loginMobileUser.resolves({
      user: {
        id: 5,
        email: "mobile@example.com",
        name: "Mobile User",
      },
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresIn: 900,
    });

    await controller.login(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.user.email).to.equal("mobile@example.com");
    expect(res.body.data.session.refreshToken).to.equal("refresh-token");
  });

  it("returns notification items and unread count for the authenticated user", async () => {
    mobileNotificationService.getNotificationSummary.resolves({
      notifications: [
        {
          simple_id: 10,
          type: "reminder",
          content: "Drink water",
          status: "unread",
          created_at: "2026-03-30T10:00:00.000Z",
        },
      ],
      unreadCount: 3,
    });

    const req = {
      query: { limit: "10" },
      user: { userId: 77 },
    };
    const res = createResponse();

    await controller.getMyNotifications(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.meta.unreadCount).to.equal(3);
    expect(res.body.data.items[0].id).to.equal(10);
  });

  it("returns compact recommendation cards for mobile clients", async () => {
    const req = {
      body: {
        maxResults: 2,
        dietaryConstraints: {},
      },
      user: {
        userId: 42,
        email: "mobile@example.com",
      },
    };
    const res = createResponse();

    mobileRecommendationService.generateMobileRecommendations.resolves({
      generatedAt: "2026-03-30T11:00:00.000Z",
      contractVersion: "recommendation-response-v1",
      source: { strategy: "hybrid_rule_based" },
      recommendations: [
        {
          rank: 1,
          recipeId: 1,
          title: "Protein Bowl",
          explanation: "supports higher protein intake",
          metadata: {
            nutrition: { calories: 350, protein: 20 },
            preparationTime: 15,
            totalServings: 2,
          },
        },
      ],
    });

    await controller.getRecommendations(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.meta.count).to.equal(1);
    expect(res.body.data.items[0].title).to.equal("Protein Bowl");
    expect(res.body.data.items[0].nutrition.protein).to.equal(20);
  });

  it("returns the authenticated user profile with the mobile envelope", async () => {
    const req = {
      user: {
        email: "mobile@example.com",
      },
    };
    const res = createResponse();

    mobileProfileService.getProfileByEmail.resolves({
      user_id: 42,
      email: "mobile@example.com",
      name: "Mobile User",
      first_name: "Mobile",
      last_name: "User",
      contact_number: "0400000000",
      address: "Melbourne",
      mfa_enabled: true,
      image_url: "https://cdn.example.com/avatar.png",
    });

    await controller.getMe(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.data.user.id).to.equal(42);
    expect(res.body.data.user.mfaEnabled).to.equal(true);
  });

  it("returns an empty notifications list with 200 status", async () => {
    mobileNotificationService.getNotificationSummary.resolves({
      notifications: [],
      unreadCount: 0,
    });

    const req = {
      query: {},
      user: { userId: 77 },
    };
    const res = createResponse();

    await controller.getMyNotifications(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.data.items).to.deep.equal([]);
    expect(res.body.meta.unreadCount).to.equal(0);
  });

  it("returns an empty meal plan list with 200 status", async () => {
    const req = {
      user: { userId: 42 },
    };
    const res = createResponse();

    mobileMealPlanService.getMealPlansByUserId.resolves(null);

    await controller.getMyMealPlans(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.data.items).to.deep.equal([]);
    expect(res.body.meta.count).to.equal(0);
  });

  it("returns a compact home summary for the authenticated user", async () => {
    mobileHomeService.getHomeSummary.resolves({
      profile: {
        user_id: 42,
        email: "mobile@example.com",
        name: "Mobile User",
        first_name: "Mobile",
        last_name: "User",
        mfa_enabled: false,
      },
      mealPlans: [
        {
          id: 3,
          meal_type: "lunch",
          recipes: [],
        },
      ],
      notifications: [
        {
          simple_id: 1,
          type: "reminder",
          content: "Drink water",
          status: "unread",
          created_at: "2026-03-30T10:00:00.000Z",
        },
      ],
      unreadCount: 2,
      recommendations: {
        recommendations: [
          {
            rank: 1,
            recipeId: 11,
            title: "Salad Bowl",
            explanation: "light and balanced",
            metadata: {
              nutrition: { calories: 250 },
              preparationTime: 10,
              totalServings: 1,
            },
          },
        ],
      },
    });

    const req = {
      body: {},
      user: {
        userId: 42,
        email: "mobile@example.com",
      },
    };
    const res = createResponse();

    await controller.getHomeSummary(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.data.notifications.unreadCount).to.equal(2);
    expect(res.body.data.recommendations[0].title).to.equal("Salad Bowl");
    expect(res.body.data.mealPlan.id).to.equal(3);
  });

  it("returns a validation error when login payload is incomplete", async () => {
    const req = {
      body: {
        email: "mobile@example.com",
      },
      get() {
        return null;
      },
    };
    const res = createResponse();

    await controller.login(req, res);

    expect(res.statusCode).to.equal(400);
    expect(res.body.success).to.equal(false);
    expect(res.body.error.code).to.equal("VALIDATION_ERROR");
  });
});
