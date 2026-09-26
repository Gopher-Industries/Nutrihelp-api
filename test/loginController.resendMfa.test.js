const { expect } = require("chai");
const sinon = require("sinon");
const proxyquire = require("proxyquire").noCallThru();

function createRes() {
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

describe("loginController resendMfa", () => {
  let getUserCredentials;
  let addMfaToken;
  let invalidateMfaTokens;
  let validationResultStub;
  let transporter;
  let controller;

  beforeEach(() => {
    getUserCredentials = sinon.stub();
    addMfaToken = sinon.stub().resolves();
    invalidateMfaTokens = sinon.stub().resolves();
    validationResultStub = sinon.stub().returns({
      isEmpty: () => true,
      array: () => [],
    });
    transporter = { sendMail: sinon.stub().resolves() };

    controller = proxyquire("../controller/loginController", {
      "../model/getUserCredentials.js": getUserCredentials,
      "../model/addMfaToken.js": {
        addMfaToken,
        invalidateMfaTokens,
        verifyMfaToken: sinon.stub(),
      },
      "express-validator": { validationResult: validationResultStub },
      nodemailer: {
        createTransport: sinon.stub().returns(transporter),
      },
      "../Monitor_&_Logging/loginLogger": sinon.stub().resolves(),
      "../dbConnection": {},
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("resends a new MFA token for MFA-enabled accounts", async () => {
    const req = {
      body: { email: "mfa@example.com" },
    };
    const res = createRes();

    getUserCredentials.resolves({
      user_id: 77,
      email: "mfa@example.com",
      mfa_enabled: true,
    });

    await controller.resendMfa(req, res);

    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(invalidateMfaTokens.calledWith(77)).to.equal(true);
    expect(addMfaToken.calledOnce).to.equal(true);
  });

  it("rejects resend requests for accounts without MFA enabled", async () => {
    const req = {
      body: { email: "plain@example.com" },
    };
    const res = createRes();

    getUserCredentials.resolves({
      user_id: 13,
      email: "plain@example.com",
      mfa_enabled: false,
    });

    await controller.resendMfa(req, res);

    expect(res.statusCode).to.equal(404);
    expect(res.body.error).to.equal("MFA is not enabled for this account");
  });
});
