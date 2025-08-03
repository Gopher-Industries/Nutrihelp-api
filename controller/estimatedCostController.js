let getFullorPartialCost = require('../model/getFullorPartialCost');

const getFullCost = async (req, res) => {
  const recipe_id = req.params.recipe_id;
  var desired_servings = req.query.desired_servings;

  try {
    if (!desired_servings) { 
      desired_servings = 0; 
    }
    const result = await getFullorPartialCost.estimateCost(recipe_id,desired_servings,"",true);
    
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

const getPartialCost = async (req, res) => {
  const { recipe_id, exclude_ids } = req.params;
  var desired_servings = req.query.desired_servings;

  try {
    if (!desired_servings) { 
      desired_servings = 0; 
    }
    const result = await getFullorPartialCost.estimateCost(recipe_id,desired_servings,exclude_ids,false);

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
  getFullCost,
  getPartialCost
}