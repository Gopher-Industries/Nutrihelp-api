const chai = require('chai');
const chaiHttp = require('supertest');
const server = require('../server');
const expect = chai.expect;

describe('Core Utility Flows', () => {
  describe('GET /api/recipes', () => {
    it('should return 200 and recipes array for valid user_id', (done) => {
      chaiHttp(server)
        .get('/api/recipes?user_id=15')
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data.recipes).to.be.an('array');
          done();
        });
    });

    it('should return 400 if user_id is missing', (done) => {
      chaiHttp(server)
        .get('/api/recipes')
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Validation Error');
          done();
        });
    });
  });

  describe('GET /api/water', () => {
    it('should return 200 and hydration data', (done) => {
      chaiHttp(server)
        .get('/api/water?user_id=15')
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.success).to.be.true;
          done();
        });
    });
  });

  describe('GET /api/appointments', () => {
    it('should return 200 and appointments array', (done) => {
      chaiHttp(server)
        .get('/api/appointments?user_id=15')
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.success).to.be.true;
          expect(res.body.data.appointments).to.be.an('array');
          done();
        });
    });
  });

  describe('POST /api/recipes (validation)', () => {
    it('should return 400 for missing body', (done) => {
      chaiHttp(server)
        .post('/api/recipes')
        .send({})
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Validation Error');
          done();
        });
    });
  });
});
