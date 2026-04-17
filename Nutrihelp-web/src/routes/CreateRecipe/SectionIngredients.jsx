import './CreateRecipe.css'

import {
    IngredientField, IngredientCategoryField,
    InstructionsField, AddAnImageField, IngredientTableField,
    IngredientQuanityField
} from './Fields'
import React, { useState } from 'react'
import SectionHeader from './SectionHeader'
import { Button } from 'semantic-ui-react'



// Define a component for the "Ingredients" section of a form
const IngredientsSection = (props) => {


    function changeEditState(record) {
        let counter = 0;
        props.tableData.forEach(element => {
          if (record.ingredient === element.ingredient) {
            counter++
          }
        });
    
        if (counter > 0 && !props.isEditing) {
            props.onIsEditingChange(true)
        }
        else if (counter > 0 && props.isEditing)  {
            props.onIsEditingChange(true)
        }
        else if (counter == 0 && !props.isEditing)  {
            props.onIsEditingChange(true)
        }
        else if (counter == 0 && props.isEditing)  {
            props.onIsEditingChange(false)
        }
      }
    
      function addIngedient() {
    
        if (props.ingredientCategory && props.ingredient && props.ingredientQuantity) {
          let record = {
            'ingredientCategory': props.ingredientCategory,
            'ingredient': props.ingredient,
            'ingredientQuantity': props.ingredientQuantity
          }
          changeEditState(record)
          if (!props.isEditing) {
            props.tableData.push(record) 
          }
          changeEditState(record)
        }
      }

    return (
        <div className='form-section'>
            <SectionHeader text='Ingredients' />
            <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <IngredientCategoryField
                        ingredientCategory={props.ingredientCategory}
                        onIngredientCategoryChange={props.onIngredientCategoryChange}
                        ingredientListDB={props.ingredientListDB}
                    />
                </div>
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <IngredientField
                        ingredient={props.ingredient}
                        onIngredientChange={props.onIngredientChange}
                        ingredientCategory={props.ingredientCategory}
                        ingredientListDB={props.ingredientListDB}
                    />
                </div>
            </div>
            <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <IngredientQuanityField
                        ingredientQuantity={props.ingredientQuantity}
                        onIngredientQuantityChange={props.onIngredientQuantityChange}
                    />
                </div>
                <div class="col-lg-2 col-md-2 col-sm-12 col-xs-12"></div>
                <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                    <div className='browse-and-upload-buttons-div'>
                        <Button className='button-primary' style={{ width: 'auto', overflow: 'visible' }}
                            onClick={addIngedient}>Add Ingredient</Button>
                    </div>
                </div>
            </div>
            <div class="row recipe-table">
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Ingredient</th>
                            <th>Quantity</th>
                            <th>Delete Ingredient</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.tableData.map(record =>
                            <IngredientTableField
                                key={record.ingredient}
                                record={record}
                            />)}
                    </tbody>
                </table>
            </div>
            <div class="row">
                <div>
                    <InstructionsField
                        instructions={props.instructions}
                        onInstructionsChange={props.onInstructionsChange}
                    />
                </div>
            </div>
            <div class="row">
                <div className='form-section'>
                    <SectionHeader text='Add An Image' />
                    <div class="row">
                        <AddAnImageField onImageAdded={props.onImageAdded} />
                    </div>
                </div>
            </div>
        </div>
    )
}




export default IngredientsSection