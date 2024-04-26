const supabase = require('../dbConnection.js');

async function fetchAllCookingMethods() {
    try {
        // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "Bake"
            },
            {
                "id": 2,
                "name": "Boil"
            },
            {
                "id": 3,
                "name": "Fry"
            },
            {
                "id": 4,
                "name": "Grill"
            },
            {
                "id": 5,
                "name": "Roast"
            },
            {
                "id": 6,
                "name": "Sauté"
            },
            {
                "id": 7,
                "name": "Simmer"
            },
            {
                "id": 8,
                "name": "Steam"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCookingMethods;