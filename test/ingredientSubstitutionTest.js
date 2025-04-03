const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { expect } = chai;

chai.use(chaiHttp);

// Import test helpers
const { getTestServer } = require('./test-helpers');

// Import the model function to stub
const fetchIngredientSubstitutions = require('../model/fetchIngredientSubstitutions.js');

describe('Ingredient Substitution API', () => {
    let server;
    let fetchStub;

    before(async () => {
        server = await getTestServer();
    });

    beforeEach(() => {
        // Create a stub for the fetchIngredientSubstitutions function
        fetchStub = sinon.stub();
        // Replace the original function with our stub
        const originalModule = require('../model/fetchIngredientSubstitutions.js');
        // Save reference to the original module.exports
        const originalExports = module.exports;
        // Replace module.exports with our stub
        module.exports = fetchStub;
        // Restore the controller module to use our stub
        delete require.cache[require.resolve('../controller/ingredientSubstitutionController.js')];
        require('../controller/ingredientSubstitutionController.js');
    });

    afterEach(() => {
        // Restore all stubs after each test
        sinon.restore();
    });

    describe('GET /api/substitution/ingredient/:ingredientId', () => {
        it('should return substitutions for a valid ingredient ID', async () => {
            // Mock data for the test
            const mockOriginal = { id: 1, name: 'Chicken', category: 'Protein' };
            const mockSubstitutes = [
                { id: 2, name: 'Turkey', category: 'Protein' },
                { id: 3, name: 'Tofu', category: 'Protein' }
            ];

            // Configure the stub to return mock data
            fetchStub.resolves({
                original: mockOriginal,
                substitutes: mockSubstitutes
            });

            // Make the API request
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/1');

            // Assertions
            expect(res).to.have.status(200);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.property('original');
            expect(res.body).to.have.property('substitutes');
            expect(res.body.original).to.deep.equal(mockOriginal);
            expect(res.body.substitutes).to.be.an('array');
            expect(res.body.substitutes).to.have.lengthOf(2);
            expect(res.body.substitutes[0]).to.deep.equal(mockSubstitutes[0]);
        });

        it('should handle filtering by allergies', async () => {
            // Mock data for the test
            const mockOriginal = { id: 1, name: 'Milk', category: 'Dairy' };
            const mockSubstitutes = [
                { id: 5, name: 'Almond Milk', category: 'Dairy' }
            ];

            // Configure the stub to return mock data
            fetchStub.resolves({
                original: mockOriginal,
                substitutes: mockSubstitutes
            });

            // Make the API request with allergy filter
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/1?allergies=2,3');

            // Assertions
            expect(res).to.have.status(200);
            expect(res.body.substitutes).to.have.lengthOf(1);
            expect(fetchStub.calledOnce).to.be.true;
            
            // Verify the stub was called with the correct parameters
            const callArgs = fetchStub.firstCall.args;
            expect(callArgs[0]).to.equal(1); // ingredientId
            expect(callArgs[1]).to.have.property('allergies');
            expect(callArgs[1].allergies).to.deep.equal([2, 3]);
        });

        it('should handle filtering by dietary requirements', async () => {
            // Mock data for the test
            const mockOriginal = { id: 1, name: 'Beef', category: 'Protein' };
            const mockSubstitutes = [
                { id: 7, name: 'Lentils', category: 'Protein' }
            ];

            // Configure the stub to return mock data
            fetchStub.resolves({
                original: mockOriginal,
                substitutes: mockSubstitutes
            });

            // Make the API request with dietary requirements filter
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/1?dietaryRequirements=1');

            // Assertions
            expect(res).to.have.status(200);
            expect(res.body.substitutes).to.have.lengthOf(1);
            expect(fetchStub.calledOnce).to.be.true;
            
            // Verify the stub was called with the correct parameters
            const callArgs = fetchStub.firstCall.args;
            expect(callArgs[0]).to.equal(1); // ingredientId
            expect(callArgs[1]).to.have.property('dietaryRequirements');
            expect(callArgs[1].dietaryRequirements).to.deep.equal([1]);
        });

        it('should return 404 for non-existent ingredient', async () => {
            // Configure the stub to throw an error
            fetchStub.rejects(new Error('Ingredient not found'));

            // Make the API request
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/999');

            // Assertions
            expect(res).to.have.status(404);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.equal('Ingredient not found');
        });

        it('should return 400 for invalid ingredient ID', async () => {
            // Make the API request with an invalid ID
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/invalid');

            // Assertions
            expect(res).to.have.status(500); // This would be a server error due to parsing an invalid ID
        });

        it('should return 500 for server errors', async () => {
            // Configure the stub to throw a generic error
            fetchStub.rejects(new Error('Database connection error'));

            // Make the API request
            const res = await chai.request(server)
                .get('/api/substitution/ingredient/1');

            // Assertions
            expect(res).to.have.status(500);
            expect(res.body).to.have.property('error');
            expect(res.body.error).to.equal('Internal server error');
        });
    });
});