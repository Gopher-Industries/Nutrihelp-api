const supabase = require("../dbConnection.js");

async function fetchAllFoodTypes() {
    try {
        // TODO query database here when implemented
        let dummyData = [
            {
                "id": 1,
                "name": "Tomatoes"
            },
            {
                "id": 2,
                "name": "Coriander"
            },
            {
                "id": 3,
                "name": "Carrots"
            },
            {
                "id": 4,
                "name": "Potatoes"
            },
            {
                "id": 5,
                "name": "Meat"
            },
            {
                "id": 6,
                "name": "Seafood"
            },
            {
                "id": 7,
                "name": "Chicken"
            },
            {
                "id": 8,
                "name": "Prawns"
            },
            {
                "id": 9,
                "name": "Mushrooms"
            },
            {
                "id": 10,
                "name": "Eggs"
            },
            {
                "id": 11,
                "name": "Onions"
            },
            {
                "id": 12,
                "name": "Garlic"
            },
            {
                "id": 13,
                "name": "Ginger"
            },
            {
                "id": 14,
                "name": "Chilli"
            },
            {
                "id": 15,
                "name": "Cheese"
            },
            {
                "id": 16,
                "name": "Rice"
            },
            {
                "id": 17,
                "name": "Pasta"
            },
            {
                "id": 18,
                "name": "Bread"
            },
            {
                "id": 19,
                "name": "Beans"
            },
            {
                "id": 20,
                "name": "Lentils"
            }
        ]

        return dummyData;
    } catch (error) {
        throw error;
    }
}

module.exports = fetchAllFoodTypes;