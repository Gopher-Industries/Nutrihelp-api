import "./RecipeCardExtensionField.css";

import React from "react";

const RecipeCardExtensionField = (props) => {
  return (
    <>
      <div>
        <h3>{props.fieldName}: </h3>
        <p> {props.fieldValue}</p>
      </div>

      <br />
    </>
  );
};

export default RecipeCardExtensionField;
