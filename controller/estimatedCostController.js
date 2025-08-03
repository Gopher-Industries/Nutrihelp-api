let getFullorPartialCost = require('../model/getFullorPartialCost');

const getCost = async (req, res) => {
  const recipe_id = req.params.recipe_id;
  var { desired_servings, exclude_ids } = req.query;

  try {
    if (!desired_servings) { 
      desired_servings = 0; 
    }
    if (!exclude_ids) { 
      exclude_ids = ""; 
    }

    const result = await getFullorPartialCost.estimateCost(recipe_id, desired_servings, exclude_ids);
    
    if (result.status != 200) {
      return res.status(result.status).json({
        error: result.error
      });
    }

    return res.status(200).json(result.estimatedCost);
  } catch (error) {
    console.error("Error in estimation process: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  getCost
}