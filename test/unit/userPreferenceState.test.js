const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");

describe("userPreferenceState model", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("returns normalized defaults when no state row exists", async () => {
    const maybeSingle = sinon.stub().resolves({ data: null, error: null });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub().returns({ select });

    const { getUserPreferenceState } = proxyquire("../../model/userPreferenceState", {
      "../dbConnection.js": { from },
    });

    const state = await getUserPreferenceState(42);

    expect(from.calledWith("user_preference_states")).to.equal(true);
    expect(state).to.deep.equal({
      health_context: {
        allergies: [],
        chronic_conditions: [],
        medications: [],
      },
      notification_preferences: {},
      ui_settings: {},
    });
  });

  it("upserts normalized preference state into Supabase", async () => {
    const single = sinon.stub().resolves({
      data: {
        health_context: { allergies: [{ name: "Peanuts" }], chronic_conditions: [], medications: [] },
        notification_preferences: { mealReminders: false },
        ui_settings: { theme: "dark" },
      },
      error: null,
    });
    const selectAfterUpsert = sinon.stub().returns({ single });
    const upsert = sinon.stub().returns({ select: selectAfterUpsert });
    const maybeSingle = sinon.stub().resolves({ data: null, error: null });
    const eq = sinon.stub().returns({ maybeSingle });
    const select = sinon.stub().returns({ eq });
    const from = sinon.stub();
    from.onCall(0).returns({ select });
    from.onCall(1).returns({ upsert });

    const { saveUserPreferenceState } = proxyquire("../../model/userPreferenceState", {
      "../dbConnection.js": { from },
    });

    const state = await saveUserPreferenceState(42, {
      health_context: { allergies: [{ name: "Peanuts" }] },
      notification_preferences: { mealReminders: false },
      ui_settings: { theme: "dark" },
    });

    expect(upsert.calledOnce).to.equal(true);
    expect(upsert.firstCall.args[0]).to.deep.equal({
      user_id: 42,
      health_context: {
        allergies: [{ name: "Peanuts" }],
        chronic_conditions: [],
        medications: [],
      },
      notification_preferences: { mealReminders: false },
      ui_settings: { theme: "dark" },
    });
    expect(state.notification_preferences.mealReminders).to.equal(false);
    expect(state.ui_settings.theme).to.equal("dark");
  });
});
