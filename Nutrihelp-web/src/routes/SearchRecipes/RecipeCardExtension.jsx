import { Grid, GridColumn, GridRow, Icon, Image } from "semantic-ui-react";
import React from "react";
import RecipeCardExtensionField from "./RecipeCardExtensionField";
import "./RecipeCardExtension.css";    // ← new import
import backgroundLeft from "../../images/bg-left.png";
import backgroundRight from "../../images/bg-right.png";

const RecipeCardExtension = (props) => {
  if (!props.recipeName) {
    return null; // If recipeName doesn't exist, don't render the modal
  }

  return (
    <div className="recipe-card-modal">
      <div className="recipe-modal-content">
        <Icon onClick={props.handleCardClick} name="close" />
        <Image className="vector-bg-left" src={backgroundLeft} />
        <Image className="vector-bg-right" src={backgroundRight} />
        <div className="recipe-modal-box">
          <h2>{props.recipeName || "Recipe Name Missing"}</h2>
          <br />
          <Grid divided="vertically">
            <GridRow>
              <GridColumn className="recipe-modal-column" width={7}>
                <div className="column-box">
                  <RecipeCardExtensionField
                    fieldName="Preparation Time"
                    fieldValue={props.preparationTime || "N/A"}
                  />

                  <RecipeCardExtensionField
                    fieldName="Total Servings"
                    fieldValue={props.totalServings || "N/A"}
                  />

                  {Array.isArray(props.ingredients) && (
                    <RecipeCardExtensionField
                      fieldName="Ingredients"
                      fieldValue={props.ingredients.map((ingredient) => (
                        <div key={ingredient.id}>
                          {ingredient.quantity || "N/A"} {ingredient.name || "N/A"}
                        </div>
                      ))}
                    />
                  )}
                </div>
              </GridColumn>
              <GridColumn className="recipe-modal-column" width={7}>
                <RecipeCardExtensionField
                  fieldName="Instructions"
                  fieldValue={props.instructions || "No Instructions Provided"}
                />
              </GridColumn>
            </GridRow>
          </Grid>
        </div>
      </div>
    </div>
  );
};

export default RecipeCardExtension;
