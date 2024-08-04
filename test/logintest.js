require('dotenv').config();
const chai = require('chai');
const chaiHttp = require('chai-http');
// const server = require('../server');
const { expect } = chai;

chai.use(chaiHttp);

const username = "wrongusername"
const password = "wrongpassword"

describe('Login test /api/login', () =>
{
    it('should return 401 Invalid username or password', (done) => {
        chai.request('http://localhost:80')
            .post('/api/login')
            .send({ username, password })
            .end((err, res) => {
                if (err) return done(err);
            
                expect(res).to.have.status(401);
            
                done();
            });
    });
});