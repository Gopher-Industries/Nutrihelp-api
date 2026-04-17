import './CreateRecipe.css'

import { CuisineField, TotalServingsField, PreparationTimeField, RecipeNameField } from './Fields'
import React from 'react'
import SectionHeader from './SectionHeader'

// Define a component for the "Recipe Description" section of a form
const RecipeDescriptionSection = (props) => {

    return (
        <div className='form-section'>
            <SectionHeader text='Recipe Description' />
            <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <RecipeNameField
                        recipeName={props.recipeName}
                        onRecipeNameChange={props.onRecipeNameChange}
                    />
                </div>
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <CuisineField
                        cuisine={props.cuisine}
                        onCuisineChange={props.onCuisineChange}
                        cuisineListDB={props.cuisineListDB}
                    />
                </div>
            </div>
            <SectionHeader text='Cooking Details' />
            <div class="row">
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <PreparationTimeField
                        preparationTime={props.preparationTime}
                        onPreparationTimeChange={props.onPreparationTimeChange}
                    />
                </div>
                <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                    <TotalServingsField
                        totalServings={props.totalServings}
                        onTotalServingsChange={props.onTotalServingsChange}
                    />
                </div>
            </div>
        </div>
    )
}



export default RecipeDescriptionSection