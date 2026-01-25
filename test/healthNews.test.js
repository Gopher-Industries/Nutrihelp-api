require("dotenv").config();
const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');

let createdNewsId;
let createdCategoryId;
let createdAuthorId;
let createdTagId;

describe('Health News API', () => {

    // ================== GET ENDPOINTS ==================
    describe('GET /api/health-news', () => {

        it('should fetch all health news', async () => {
            const res = await request(app).get('/api/health-news');
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.be.an('array');
        });

        it('should fetch news by ID', async () => {
            // First create a news item to get by ID
            const newsRes = await request(app)
                .post('/api/health-news')
                .send({ title: 'Test News', summary: 'Summary', content: 'Content' });
            createdNewsId = newsRes.body.data.id;

            const res = await request(app).get('/api/health-news').query({ id: createdNewsId });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data.id).to.equal(createdNewsId);
        });

        it('should return 400 if getById without ID', async () => {
            const res = await request(app).get('/api/health-news').query({ action: 'getById' });
            expect(res.statusCode).to.equal(400);
            expect(res.body.success).to.be.false;
        });

        it('should fetch all categories', async () => {
            const res = await request(app).get('/api/health-news').query({ type: 'categories' });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.be.an('array');
        });

        it('should fetch all authors', async () => {
            const res = await request(app).get('/api/health-news').query({ type: 'authors' });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.be.an('array');
        });

        it('should fetch all tags', async () => {
            const res = await request(app).get('/api/health-news').query({ type: 'tags' });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data).to.be.an('array');
        });
    });

    // ================== POST ENDPOINTS ==================
    describe('POST /api/health-news', () => {

        it('should create a news article', async () => {
            const res = await request(app)
                .post('/api/health-news')
                .send({
                    title: 'New Jest News',
                    summary: 'Jest Summary',
                    content: 'Some content',
                });
            expect(res.statusCode).to.equal(201);
            expect(res.body.success).to.be.true;
            createdNewsId = res.body.data.id;
        });

        it('should create an author', async () => {
            const res = await request(app)
                .post('/api/health-news')
                .send({ name: 'Test Author', bio: 'Author Bio' });
            expect(res.statusCode).to.equal(201);
            expect(res.body.success).to.be.true;
            createdAuthorId = res.body.data.id;
        });
    });

    // ================== PUT ENDPOINT ==================
    describe('PUT /api/health-news', () => {
        it('should update a news article', async () => {
            const res = await request(app)
                .put('/api/health-news')
                .query({ id: createdNewsId })
                .send({ title: 'Updated Title' });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.data.title).to.equal('Updated Title');
        });

        it('should return 400 if id missing', async () => {
            const res = await request(app)
                .put('/api/health-news')
                .send({ title: 'Updated Title' });
            expect(res.statusCode).to.equal(400);
            expect(res.body.success).to.be.false;
        });
    });

    // ================== DELETE ENDPOINT ==================
    describe('DELETE /api/health-news', () => {
        it('should delete a news article', async () => {
            const res = await request(app)
                .delete('/api/health-news')
                .query({ id: createdNewsId });
            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.message).to.match(/successfully deleted/i);
        });

        it('should return 400 if id missing', async () => {
            const res = await request(app).delete('/api/health-news');
            expect(res.statusCode).to.equal(400);
            expect(res.body.success).to.be.false;
        });
    });
});
