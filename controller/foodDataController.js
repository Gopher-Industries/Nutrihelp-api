const fetchAllDietaryRequirements = require("../model/fetchAllDietaryRequirements.js");
const fetchAllCuisines = require("../model/fetchAllCuisines.js");
const fetchAllAllergies = require("../model/fetchAllAllergies.js");
const fetchAllFoodTypes = require("../model/fetchAllFoodTypes.js");
const fetchAllCookingMethods = require("../model/fetchAllCookingMethods.js");
const fetchAllSpiceLevels = require("../model/fetchAllSpiceLevels.js");

const getAllDietaryRequirements = async (req, res) => {
    try {
        const dietaryRequirements = await fetchAllDietaryRequirements();
        return res.status(200).json(dietaryRequirements);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

const getAllCuisines = async (req, res) => {
    try {
        const cuisines = await fetchAllCuisines();
        return res.status(200).json(cuisines);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

const getAllAllergies = async (req, res) => {
    try {
        const allergies = await fetchAllAllergies();
        return res.status(200).json(allergies);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

const getAllFoodTypes = async (req, res) => {
    try {
        const foodTypes = await fetchAllFoodTypes();
        return res.status(200).json(foodTypes);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

const getAllCookingMethods = async (req, res) => {
    try {
        const cookingMethods = await fetchAllCookingMethods();
        return res.status(200).json(cookingMethods);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

const getAllSpiceLevels = async (req, res) => {
    try {
        const spiceLevels = await fetchAllSpiceLevels();
        return res.status(200).json(spiceLevels);
    } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Internal server error"});
    }
};

module.exports = {
    getAllDietaryRequirements,
    getAllCuisines,
    getAllAllergies,
    getAllFoodTypes,
    getAllCookingMethods,
    getAllSpiceLevels
};