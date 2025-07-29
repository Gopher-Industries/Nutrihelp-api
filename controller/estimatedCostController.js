let getFullorPartialCost = require('../model/getFullorPartialCost');

const getFullCost = async (req, res) => {
  // const recipe_id = parseInt(req.query.recipe_id);
  const recipe_id = req.params.recipe_id;

  try {
    const {estimatedCost} = await getFullorPartialCost.CostEstimation(recipe_id,0,true);
    return res.status(200).json(estimatedCost);
  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

const getPartialCost = async (req, res) => {
  const { recipe_id, exclude_ids } = req.params;

  try {

    const {estimatedCost} = await getFullorPartialCost.CostEstimation(recipe_id,exclude_ids,false);
    return res.status(200).json(estimatedCost);
  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  getFullCost,
  getPartialCost
}