const request = require("supertest");
const app = require("../server.js");

describe("Appointment V2 API - CRUD Tests (Jest)", () => {

  let createdAppointmentId;

  /**
   * =========================
   * CREATE
   * =========================
   */
  describe("POST /api/appointments/v2", () => {

    test("should return 400 when required fields are missing", async () => {
      const res = await request(app)
        .post("/api/appointments/v2")
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    test("should create an appointment and return 201", async () => {
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
          reminder: true
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message).toBe("Appointment saved successfully");
      expect(res.body).toHaveProperty("appointment");
      expect(res.body.appointment).toHaveProperty("id");

      createdAppointmentId = res.body.appointment.id;
    });
  });

  /**
   * =========================
   * READ
   * =========================
   */
  describe("GET /api/appointments/v2", () => {

    test("should return paginated appointments", async () => {
      const res = await request(app)
        .get("/api/appointments/v2?page=1&pageSize=5");

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("appointments");
      expect(Array.isArray(res.body.appointments)).toBe(true);
    });
  });

  /**
   * =========================
   * UPDATE
   * =========================
   */
  describe("PUT /api/appointments/v2/:id", () => {

    test("should update an existing appointment", async () => {
      const res = await request(app)
        .put(`/api/appointments/v2/${createdAppointmentId}`)
        .send({
          title: "Updated Checkup",
          doctor: "Dr. John",
          type: "Follow-up"
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Appointment updated successfully");
      expect(res.body.appointment.title).toBe("Updated Checkup");
    });

    test("should return 404 when appointment does not exist", async () => {
      const res = await request(app)
        .put("/api/appointments/v2/999999")
        .send({ title: "Not exist" });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Appointment not found");
    });
  });

  /**
   * =========================
   * DELETE
   * =========================
   */
  describe("DELETE /api/appointments/v2/:id", () => {

    test("should delete an existing appointment", async () => {
      const res = await request(app)
        .delete(`/api/appointments/v2/${createdAppointmentId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Appointment deleted successfully");
    });

    test("should return 404 when deleting non-existing appointment", async () => {
      const res = await request(app)
        .delete("/api/appointments/v2/999999");

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe("Appointment not found");
    });
  });

});
