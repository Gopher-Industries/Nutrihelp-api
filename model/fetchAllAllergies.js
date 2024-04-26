const supabase = require('../dbConnection.js');

async function fetchAllAllergies() {
    try {
       // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "Peanuts"
            },
            {
                "id": 2,
                "name": "Shrimp"
            },
            {
                "id": 3,
                "name": "Gluten"
            },
            {
                "id": 4,
                "name": "Dairy"
            },
            {
                "id": 5,
                "name": "Eggs"
            },
            {
                "id": 6,
                "name": "Soy"
            },
            {
                "id": 7,
                "name": "Fish"
            },
            {
                "id": 8,
                "name": "Shellfish"
            },
            {
                "id": 9,
                "name": "Tree Nuts"
            },
            {
                "id": 10,
                "name": "Wheat"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllAllergies;