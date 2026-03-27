const { expect } = require("chai");
const request = require("supertest");
const express = require("express");
const proxyquire = require("proxyquire");
const { appointmentValidatorV2 } = require("../validators/appointmentValidator");
const validate = require("../middleware/validateRequest");

const appointmentModel = {
  addAppointmentModelV2: jest.fn(),
  updateAppointmentModel: jest.fn(),
  deleteAppointmentById: jest.fn(),
};

const appointmentQueryModel = {
  getAllAppointmentsV2: jest.fn(),
};

const controller = proxyquire("../controller/appointmentController", {
  "../model/appointmentModel.js": appointmentModel,
  "../model/getAppointments.js": appointmentQueryModel,
});

const app = express();
app.use(express.json());
app.post("/api/appointments/v2", appointmentValidatorV2, validate, controller.saveAppointmentV2);
app.put("/api/appointments/v2/:id", controller.updateAppointment);
app.delete("/api/appointments/v2/:id", controller.delAppointment);
app.get("/api/appointments/v2", controller.getAppointmentsV2);

describe("Appointment V2 API - CRUD Tests", () => {
  let createdAppointmentId;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/appointments/v2", () => {
    it("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/appointments/v2")
        .send({});

      expect(res.statusCode).to.equal(400);
      expect(res.body).to.have.property("errors");
      expect(Array.isArray(res.body.errors)).to.equal(true);
    });

    it("should create an appointment and return 201", async () => {
      appointmentModel.addAppointmentModelV2.mockResolvedValue({
        id: 123,
        title: "General Checkup",
      });

      const res = await request(app)
        .post("/api/appointments/v2")
        .send({
          userId: "1",
          title: "General Checkup",
          doctor: "Dr. Smith",
          type: "Medical",
          date: "2024-01-02",
          time: "10:30",
          location: "City Clinic",
          address: "123 Test Street",
          phone: "0412345678",
          notes: "Bring reports",
          reminder: "1-day",
        });

      expect(res.statusCode).to.equal(201);
      expect(res.body.message).to.equal("Appointment saved successfully");
      expect(res.body).to.have.property("appointment");
      expect(res.body.appointment).to.have.property("id");

      createdAppointmentId = res.body.appointment.id;
    });
  });

  describe("GET /api/appointments/v2", () => {
    it("should return paginated appointments", async () => {
      appointmentQueryModel.getAllAppointmentsV2.mockResolvedValue({
        data: [{ id: 1, title: "Checkup" }],
        error: null,
        count: 1,
      });

      const res = await request(app)
        .get("/api/appointments/v2?page=1&pageSize=5");

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.have.property("appointments");
      expect(Array.isArray(res.body.appointments)).to.equal(true);
    });
  });

  describe("PUT /api/appointments/v2/:id", () => {
    it("should update an existing appointment", async () => {
      appointmentModel.updateAppointmentModel.mockResolvedValue({
        id: createdAppointmentId || 123,
        title: "Updated Checkup",
      });

      const res = await request(app)
        .put(`/api/appointments/v2/${createdAppointmentId || 123}`)
        .send({
          title: "Updated Checkup",
          doctor: "Dr. John",
          type: "Follow-up",
        });

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal("Appointment updated successfully");
      expect(res.body.appointment.title).to.equal("Updated Checkup");
    });

    it("should return 404 when appointment does not exist", async () => {
      appointmentModel.updateAppointmentModel.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/appointments/v2/999999")
        .send({ title: "Not exist" });

      expect(res.statusCode).to.equal(404);
      expect(res.body.message).to.equal("Appointment not found");
    });
  });

  describe("DELETE /api/appointments/v2/:id", () => {
    it("should delete an existing appointment", async () => {
      appointmentModel.deleteAppointmentById.mockResolvedValue({ id: createdAppointmentId || 123 });

      const res = await request(app)
        .delete(`/api/appointments/v2/${createdAppointmentId || 123}`);

      expect(res.statusCode).to.equal(200);
      expect(res.body.message).to.equal("Appointment deleted successfully");
    });

    it("should return 404 when deleting non-existing appointment", async () => {
      appointmentModel.deleteAppointmentById.mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/appointments/v2/999999");

      expect(res.statusCode).to.equal(404);
      expect(res.body.message).to.equal("Appointment not found");
    });
  });
});
