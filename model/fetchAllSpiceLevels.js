const supabase = require('../dbConnection.js');

async function fetchAllSpiceLevels() {
    try {
        // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "Mild"
            },
            {
                "id": 2,
                "name": "Medium"
            },
            {
                "id": 3,
                "name": "Hot"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllSpiceLevels;