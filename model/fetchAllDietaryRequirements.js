const supabase = require('../dbConnection.js');

async function fetchAllDietaryRequirements() {
    try {
        // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "Vegetarian"
            },
            {
                "id": 2,
                "name": "Vegan"
            },
            {
                "id": 3,
                "name": "Keto"
            },
            {
                "id": 4,
                "name": "Gluten-Free"
            },
            {
                "id": 5,
                "name": "Dairy-Free"
            },
            {
                "id": 6,
                "name": "Nut-Free"
            },
            {
                "id": 7,
                "name": "Low-Carb"
            },
            {
                "id": 8,
                "name": "Low-Fat"
            },
            {
                "id": 9,
                "name": "Low-Sodium"
            },
            {
                "id": 10,
                "name": "Low-Sugar"
            },
            {
                "id": 11,
                "name": "Organic"
            },
            {
                "id": 12,
                "name": "Raw"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllDietaryRequirements;