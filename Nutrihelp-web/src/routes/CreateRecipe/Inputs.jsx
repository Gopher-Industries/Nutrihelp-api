import React, { useState, useEffect } from 'react';
import './CreateRecipe.css';
import { Button } from 'semantic-ui-react';

// Dropdown select input component
const DropdownSelectInput = (props) => {
    // Set a default value for options if not provided
    const options = props.options;

    // Initialise selectedValue state.
    const [selectedValue, setSelectedValue] = useState('');

    // Update selectedValue state if prop changes.
    useEffect(() => {
        if (props.cuisine) {
            setSelectedValue(props.cuisine);
        }
        if (props.ingredient) {
            setSelectedValue(props.ingredient);
        }
        if (props.ingredientCategory) {
            setSelectedValue(props.ingredientCategory);
        }
    }, [props.cuisine, props.ingredient, props.ingredientCategory]);

    // Update state and inform parent component when selection changes.
    const handleChange = (e) => {
        setSelectedValue(e.target.value);

        // Inform parent component of the change.
        if (props.onCuisineChange) {
            props.onCuisineChange(e.target.value);
        }
        if (props.onIngredientChange) {
            props.onIngredientChange(e.target.value);
        }
        if (props.onIngredientCategoryChange) {
            props.onIngredientCategoryChange(e.target.value);
        }
    }

    // Render a dropdown select element with options.
    return (
        <select
            className='dropdown-select-input'
            value={selectedValue}
            onChange={handleChange}
            id='recipe_input'
        >
            {/* Map each option to a <option> element */}
            {options.map((option, index) => (
                <option key={index} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

// Component for multi-line text input
const MultipleLineTextInput = (props) => {

    // Maintain a piece of state for the value of the input
    const [inputValue, setInputValue] = useState('')

    // Use effect hook to set the input value based on incoming props, when they change
    useEffect(() => {
        if (props.ingredientsText) {
            setInputValue(props.ingredientsText);
        }
        if (props.instructions) {
            setInputValue(props.instructions);
        }
    }, [props.ingredientsText, props.instructions]);

    // Handle changes to the input value
    const handleChange = (e) => {
        setInputValue(e.target.value);

        // Conditionally call relevant callback prop when input changes
        if (props.onIngredientsTextChange) {
            props.onIngredientsTextChange(e.target.value);
        }
        if (props.onInstructionsChange) {
            props.onInstructionsChange(e.target.value);
        }
    }

    // Render a textarea with relevant props and event handlers
    return (
        <textarea className='multiple-line-text-input'
            // Assign a dynamic ID, name, and placeholder to cater for different use cases (optional)
            id={props.id || "recipe_input"}
            name={props.name || ""}
            rows="5"
            cols="50"
            value={inputValue}
            placeholder={props.placeholder}
            onChange={handleChange}>
        </textarea>
    )
}


// Input field for numbers
const NumberInput = (props) => {

    // Initialise state for the input value
    const [inputValue, setInputValue] = useState('') //Set the input value

    // Update input value based on external changes to props.initialValue
    useEffect(
        () => {
            if (props.preparationTime) {
                setInputValue(props.preparationTime);
            }
            if (props.totalServings) {
                setInputValue(props.totalServings);
            }
            if (props.ingredientQuantity) {
                setInputValue(props.ingredientQuantity);
            }
        },
        [props.preparationTime, props.totalServings, props.ingredientQuantity]
    );

    // Handle changes to the input value
    const handleChange = (e) => {
        setInputValue(e.target.value);

        // Call the callback function from the parent component
        if (props.onPreparationTimeChange) {
            props.onPreparationTimeChange(e.target.value);
        }

        // Call the callback function from the parent component
        if (props.onTotalServingsChange) {
            props.onTotalServingsChange(e.target.value);
        }

        // Call the callback function from the parent component
        if (props.onIngredientQuantityChange) {
            props.onIngredientQuantityChange(e.target.value);
        }

    }

    return (
        <input
            className='single-line-number-input'
            type="number"
            id="recipe_input"
            name=""
            min={props.min}
            max={props.max}
            step={props.step}
            onChange={handleChange}
            value={inputValue}
        />
    )
}

// Input for single line text
const SingleLineTextInput = (props) => {

    // Initialise inputValue state.
    const [inputValue, setInputValue] = useState('');

    // Update inputValue state if prop changes.
    useEffect(() => {
        if (props.recipeName) {
            setInputValue(props.recipeName);
        }

    }, [props.recipeName]);

    // Update state and inform parent component when input changes.
    const handleChange = (e) => {
        setInputValue(e.target.value);

        if (props.onRecipeNameChange) {
            props.onRecipeNameChange(e.target.value);
        }
    }

    // Render a text input element.
    return (
        <input
            className='single-line-text-input'
            id="recipe_input"
            type="text"
            value={inputValue}
            onChange={handleChange}
        />
    );
}

// Button to submit a form
const SubmitButton = ({ text, onSubmit, disabled }) => {

    return (
        <div className=''><Button className='button-primary' onClick={onSubmit} disabled={disabled}>
            {text}
        </Button>

        </div>
    )
}


export {
    DropdownSelectInput, MultipleLineTextInput,
    SubmitButton, NumberInput, SingleLineTextInput,
    //AddRawToTable
};
