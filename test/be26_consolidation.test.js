const request = require('supertest');
const BASE_URL = 'http://localhost:3001';

describe('BE26: Utility Flows Consolidation', () => {
    
    test('Recipe Flow: GET /api/recipe/user/:id should be standardized', async () => {
        const res = await request(BASE_URL).get('/api/recipe/user/15');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Appointment Flow: GET /api/appointments should enforce validation', async () => {
        const res = await request(BASE_URL).get('/api/appointments?user_id=15');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('Food Flow: GET /api/food/search should return 400 on missing query', async () => {
        const res = await request(BASE_URL).get('/api/food/search');
        expect(res.statusCode).toBe(400); // Correctly returns 400 for missing query
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe('Validation Error');
    });

    test('BigInt Safety: Should handle numeric string IDs without crashing', async () => {
        const res = await request(BASE_URL).get('/api/recipe/user/999999');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
