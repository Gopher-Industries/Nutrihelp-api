import './Fields.css' // Importing CSS for styling
import { MultipleLineTextInput, DropdownSelectInput, SingleLineTextInput, NumberInput } from './Inputs.jsx'
import Prompt from './Prompt' // Importing Prompt component for displaying the label
import React, { useState } from 'react'

// firestone
import { getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage'
import { Button } from 'semantic-ui-react'
import { storage } from '../../utils/firebase.js'


// CuisineField component definition
const CuisineField = (props) => {
    
    return (
        <div className='form-div'>

            {/* Display the prompt text*/}
            <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                <Prompt text="Cuisine" />
            </div>
            {/* DropdownSelectInput component for selecting cuisine type.
                - 'cuisine' prop is used to set the current selected value in the dropdown.
                - 'onCuisineChange' prop is a function that handles changes in the dropdown.
                - 'options' prop provides a list of cuisines to choose from in the dropdown. */}
            <div class="col-lg-8 col-md-8 col-sm-12 col-xs-12">
                <DropdownSelectInput
                    cuisine={props.cuisine}
                    onCuisineChange={props.onCuisineChange}
                    options={props.cuisineListDB}
                />
            </div>
        </div>
    )
}

// IngredientField component definition
const IngredientField = (props) => {

    const idList = []
    props.ingredientListDB.category.forEach(element => {
        if (element.value == props.ingredientCategory) {
            idList.push(element.id)
        }
    });

    let listToShow = [{ value: '', label: '', id: 0 }];
    if (idList.length == 0) {
        listToShow = props.ingredientListDB.ingredient
    }
    else {
        props.ingredientListDB.ingredient.forEach(element => {
            idList.forEach(id => {
                if (id == element.id) {
                    listToShow.push(element)
                }
            })
        })
    }

    return (
        <div className='form-div'>

            {/* Display the prompt text*/}
            <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                <Prompt text="Ingredient" />
            </div>
            {/* DropdownSelectInput component for selecting cuisine type.
                - 'cuisine' prop is used to set the current selected value in the dropdown.
                - 'onCuisineChange' prop is a function that handles changes in the dropdown.
                - 'options' prop provides a list of cuisines to choose from in the dropdown. */}
            <div class="col-lg-8 col-md-8 col-sm-12 col-xs-12">
                <DropdownSelectInput
                    ingredient={props.ingredient}
                    onIngredientChange={props.onIngredientChange}
                    options={listToShow}
                />
            </div>
        </div>
    )
}

// IngredientCategoryField component definition
const IngredientCategoryField = (props) => {

    let listToShow = [{ value: '', label: '', id: 0 }]
    let counter = 0;
    props.ingredientListDB.category.forEach(element => {
        counter = 0;
        listToShow.forEach(value => {
            if (value.value == element.value) {
                counter++;
            }
        })
        if (counter == 0) {
            listToShow.push(element)
        }
    })

    return (
        <div className='form-div'>

            {/* Display the prompt text*/}
            <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                <Prompt text="Ingredient Category" />
            </div>
            {/* DropdownSelectInput component for selecting cuisine type.
                - 'cuisine' prop is used to set the current selected value in the dropdown.
                - 'onCuisineChange' prop is a function that handles changes in the dropdown.
                - 'options' prop provides a list of cuisines to choose from in the dropdown. */}
            <div class="col-lg-8 col-md-8 col-sm-12 col-xs-12">
                <DropdownSelectInput
                    ingredientCategory={props.ingredientCategory}
                    onIngredientCategoryChange={props.onIngredientCategoryChange}
                    options={listToShow}
                />
            </div>
        </div>
    )
}

const IngredientQuanityField = (props) => (

    <div className='form-div'>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <Prompt text="Quantity g/ml" />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <NumberInput
                ingredientQuantity={props.ingredientQuantity}
                min="0"
                max="1000"
                steps="1"
                onIngredientQuantityChange={props.onIngredientQuantityChange}
            />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12"></div>
    </div>
)

// "Instructions" field for the Create Recipe page
const IngredientTableField = (props) => {
    return (
        <tr key={props.record.ingredient}>
            <td>{props.record.ingredientCategory}</td>
            <td>{props.record.ingredient}</td>
            <td>{props.record.ingredientQuantity}</td>
            <td>{false}</td>
        </tr>
    )
}


// "Recipe Name" field for the Create Recipe page
const RecipeNameField = (props) => {
    return (
        <div className='form-div'>
            <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
                <Prompt text="Recipe Name" />
            </div>
            <div class="col-lg-8 col-md-8 col-sm-12 col-xs-12">
                <SingleLineTextInput
                    recipeName={props.recipeName}
                    onRecipeNameChange={props.onRecipeNameChange} />
            </div>
        </div>
    )
}


const TotalServingsField = (props) => (

    <div className='form-div'>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <Prompt text="Total Servings" />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <NumberInput
                totalServings={props.totalServings}
                min="0"
                max="100"
                steps="0.5"
                onTotalServingsChange={props.onTotalServingsChange}
            />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12"></div>
    </div>
)

// "Preparation Time" field for the Create Recipe page
const PreparationTimeField = (props) => (

    <div className='form-div'>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <Prompt text="Preparation Time" />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
            <NumberInput
                preparationTime={props.preparationTime}
                min="0"
                max="100"
                steps="0.5"
                onPreparationTimeChange={props.onPreparationTimeChange}
            />
        </div>
        <div class="col-lg-4 col-md-4 col-sm-12 col-xs-12">
        </div>
    </div>
)

const InstructionsField = (props) => (
    <div className='form-div'>
        <div class="col-lg-2 col-md-2 col-sm-12 col-xs-12">
            <Prompt text="Instructions" />
        </div>
        <div class="col-lg-10 col-md-10 col-sm-12 col-xs-12">
            <MultipleLineTextInput
                instructions={props.instructions}
                onInstructionsChange={props.onInstructionsChange}
            />
        </div>
    </div>
)

const AddAnImageField = ({ onImageAdded }) => {

    var [timeImageUploaded, setTimeImageUploaded] = useState(0);
    const [imageUpload, setImageUpload] = useState(null);
    const [imageList, setImageList] = useState([]);

    const imageListRef = ref(storage, 'images/')

    //Upload the image
    const uploadImage = () => {
        if (imageUpload == null) return; //If image does not exist, do nothing

        timeImageUploaded = Date.now();
        setTimeImageUploaded(timeImageUploaded)

        //Define a name for the image for it to be uploaded to Firebase
        const imageRef = ref(storage, `images/${timeImageUploaded + ' - ' + imageUpload.name}`);

        uploadBytes(imageRef, imageUpload).then((snapshot) => {
            getDownloadURL(snapshot.ref).then((url) => {
                setImageList(() => [url]);
                onImageAdded(); // This will set isImageAdded to true in CreateRecipe
            })


            //Obtain a list of all the images stored in the Firebase Storage
            listAll(imageListRef).then((response) => {
                console.log(response)

                //Display the last image added in the Firebase Storage
                getDownloadURL(response.items[response.items.length - 1]).then((url) => {
                    setImageList(() => [url]);
                })
            })
        })
    }

    return (
        <div className='form-div'>
            <div class="col-lg-2 col-md-2 col-sm-12 col-xs-12">
                <Prompt text="Image" />
            </div>
            <div class="col-lg-7 col-md-7 col-sm-12 col-xs-12">
                <input
                    className='single-image-input'
                    type='file'
                    id='recipe_input'
                    onChange={(event) => { setImageUpload(event.target.files[0]) }} />
            </div>
            <div class="col-lg-1 col-md-1 col-sm-12 col-xs-12"></div>
            <div class="col-lg-2 col-md-2 col-sm-12 col-xs-12">
                <div className='browse-and-upload-buttons-div'>
                    <Button className='button-primary' style={{ width: 'auto', overflow: 'visible' }} onClick={uploadImage}>Upload Image</Button>
                </div>
            </div>

            {imageList.map((url) => {
                return <img src={url} />
            })}

        </div>
    )
}

export {
    RecipeNameField, CuisineField,
    TotalServingsField, PreparationTimeField,
    IngredientField, IngredientCategoryField,
    IngredientQuanityField, IngredientTableField,
    InstructionsField, AddAnImageField
}
//export default CuisineField // Exporting CuisineField for use in other parts of the app

