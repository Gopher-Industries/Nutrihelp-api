const axios = require('axios');

const allergenCheck = async (req, res) => {
  // const barcode = 3017624010701;
  const code = req.query.recipe_id;

  try {
    const url = `https://world.openfoodfacts.net/api/v2/product/${code}`
    
    const response = await axios.get(url);

    return res.status(200).json({
      message: "Success",
      allergen: true,
      allergen_ingredients: [],
      detail: response.data
    });
  } catch (error) {
    console.error("Error in getting barcode information: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  getIngredientSpec,
  allergenCheck
}