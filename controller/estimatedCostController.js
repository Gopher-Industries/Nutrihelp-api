let getFullorPartialCost = require('../model/getFullorPartialCost');

const getFullCost = async (req, res) => {
  // const recipe_id = parseInt(req.query.recipe_id);
  const recipe_id = req.params.recipe_id;

  try {
    const result = await getFullorPartialCost.CostEstimation(recipe_id,0,true);
    
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

  try {
    const result = await getFullorPartialCost.CostEstimation(recipe_id,exclude_ids,false);

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