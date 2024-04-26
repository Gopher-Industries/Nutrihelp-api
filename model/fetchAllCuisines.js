const supabase = require('../dbConnection.js');

async function fetchAllCuisines() {
    try {
        // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "American"
            },
            {
                "id": 2,
                "name": "Chinese"
            },
            {
                "id": 3,
                "name": "Indian"
            },
            {
                "id": 4,
                "name": "Italian"
            },
            {
                "id": 5,
                "name": "Japanese"
            },
            {
                "id": 6,
                "name": "Korean"
            },
            {
                "id": 7,
                "name": "Mexican"
            },
            {
                "id": 8,
                "name": "Thai"
            },
            {
                "id": 9,
                "name": "Vietnamese"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllCuisines;