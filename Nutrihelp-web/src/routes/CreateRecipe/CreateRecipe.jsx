import { motion } from "framer-motion";
import { useRef, useState, useEffect, useMemo, useContext } from "react";
import { MdArrowDropDown, MdArrowDropUp, MdEdit } from "react-icons/md";
import { RiDeleteBin6Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import FramerClient from "../../components/framer-client.jsx";
import {
  cuisineListDB,
  getCuisineList,
  getIngredientsList,
  getCookingMethodList,
  ingredientListDB,
  cookingMethodListDB,
} from '../../services/recepieApi.js';
import { recipeApi} from '../../services/recepieApi.js';
import { UserContext } from "../../context/user.context.jsx";

// Create Recipe page
function CreateRecipe() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { currentUser } = useContext(UserContext); // <-- add this line

  // Consolidated form data state (similar to Appointment component pattern)
  const [formData, setFormData] = useState({
    // Recipe Description
    recipeName: "",
    cuisine: "",
    // Cooking Details
    preparationTime: "",
    totalServings: "",
    cookingMethod: "",
    // Current Ingredient being added
    ingredientCategory: "",
    ingredient: "",
    ingredientQuantity: "",
    // image file (optional)
    imageFile: null,
    // Current Instruction being added
    currentInstruction: "",
  });

  // Arrays for ingredients and instructions lists
  const [instruction, setInstruction] = useState([]);
  const [tableData, setRecipeTable] = useState([]);
  const [showIngredients, setShowIngredients] = useState(true);

  const [ingredients, setIngredients] = useState([]);

  //==================== Handle changes to the fields ====================

  // Generic field change handler - works for any field in formData
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Replace the previous top-level fetch calls with local state + effect
  const [cuisines, setCuisines] = useState(cuisineListDB);
  const [ingredientsList, setIngredientsList] = useState(ingredientListDB);
  const [cookingMethods, setCookingMethods] = useState(cookingMethodListDB);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, ing, m] = await Promise.all([
          getCuisineList(),
          getIngredientsList(),
          getCookingMethodList(),
        ]);
        if (!mounted) return;
        if (c) setCuisines(c);
        if (ing) setIngredientsList(ing);
        if (m) setCookingMethods(m);
      } catch (err) {
        // silent fail — keep legacy lists
        console.error("recipe lists fetch failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Memoize mapped options to avoid remapping on every render
  const cuisineOptions = useMemo(() => {
    const list = cuisines || [];
    const unique = Array.from(new Map(list.filter(Boolean).map((c) => [c.id, c])).values());
    return unique.filter((c) => c.label).map((c) => (
      <option key={`${c.id}-${c.label}`} value={c.label}>
        {c.label}
      </option>
    ));
  }, [cuisines]);

  const ingredientOptions = useMemo(() => {
    const list = ingredientsList?.ingredient || [];
    const unique = Array.from(new Map(list.filter(Boolean).map((i) => [i.id, i])).values());
    return unique.filter((i) => i.label).map((i) => (
      <option key={`${i.id}-${i.label}`} value={i.label}>
        {i.label}
      </option>
    ));
  }, [ingredientsList]);

  const cookingMethodOptions = useMemo(() => {
    const list = cookingMethods || [];
    const unique = Array.from(new Map(list.filter(Boolean).map((m) => [m.id, m])).values());
    return unique.filter((m) => m.label || m.value).map((m) => (
      <option key={`${m.id}-${m.label ?? m.value}`} value={m.value ?? m.label}>
        {m.label ?? m.value}
      </option>
    ));
  }, [cookingMethods]);

  const handelIngredientsInTable = () => {
    const { ingredientCategory, ingredient, ingredientQuantity } = formData;
    setIngredients((prev) => [
      ...prev,
      { ingredientCategory, ingredient, ingredientQuantity },
    ]);
    setRecipeTable((prev) => [
      ...prev,
      { ingredientCategory, ingredient, ingredientQuantity },
    ]);
    setFormData((prev) => ({
      ...prev,
      ingredientCategory: "",
      ingredient: "",
      ingredientQuantity: "",
    }));
  };

  const handleRemoveTableData = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
    setRecipeTable((prev) => prev.filter((_, i) => i !== index));
  };

  //==================== Send data to the Supabase ====================
  const sendDataToSupabase = async (event) => {
    event.preventDefault();

    try {
      const file = fileInputRef.current.files[0];

      if (!isFormValid()) {
        setAttemptedSubmit(true);
        window.scrollTo(0, 0);
        return;
      }

      setAttemptedSubmit(false);

      const ingredientId = [];
      const ingredientQuantityList = [];
      let cuisineId;
      let cookingMethodId;
      const userId = currentUser?.id ?? recipeApi.getCurrentUserId?.();

      cuisineListDB.forEach((element) => {
        if (formData.cuisine === element.label) {
          cuisineId = element.id;
        }
      });

      cookingMethodListDB.forEach((element) => {
        if (formData.cookingMethod === element.label) {
          cookingMethodId = element.id;
        }
      });

      tableData.forEach((row) => {
        ingredientListDB.ingredient.forEach((element) => {
          if (row.ingredient === element.label) {
            ingredientId.push(element.id);
            ingredientQuantityList.push(parseInt(row.ingredientQuantity));
          }
        });
      });

      // Format data to match backend expectations
      const recipeData = {
        user_id: userId,
        recipe_name: formData.recipeName,
        cuisine_id: cuisineId,
        preparation_time: parseInt(formData.preparationTime),
        total_servings: parseInt(formData.totalServings),
        ingredient_id: ingredientId,
        ingredient_quantity: ingredientQuantityList,
        cooking_method_id: cookingMethodId,
        instructions: instruction.join('\n'),
      };

      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result;

          const recipeDataWithImage = {
            ...recipeData,
            recipe_image: base64Image,
          };

          await recipeApi.createRecepie(recipeDataWithImage);
          window.dispatchEvent(new Event("recipeUpdated"));
        };
        reader.readAsDataURL(file);
      } else {
        const recipeDataWithoutImage = {
          ...recipeData,
        };

        console.log(recipeDataWithoutImage)
        await recipeApi.createRecepie(recipeDataWithoutImage);
        window.dispatchEvent(new Event("recipeUpdated"));

        // fetch("http://localhost:80/api/recipe/", {
        //   method: "POST",
        //   body: JSON.stringify(recipeDataWithoutImage),
        //   headers: {
        //     Origin: "http://localhost:3000/",
        //     "Content-Type": "application/json",
        //   },
        // })
        //   .then((response) => response.json())
        //   .then((data) => {
        //     if (data.statusCode === 201) {
        //       console.log("Data successfully written to Supabase!");
        //       //alert("Recipe Creation was successful!");
        //       navigate("/searchRecipes");
        //     } else {
        //       console.log(data);
        //       alert("Recipe Creation was unsuccessful! Please try Again");
        //     }
        //   })
        //   .catch((error) => {
        //     console.error("Error sending message:", error);
        //   });
      }
    } catch (error) {
      console.error("Error writing document:", error);
    }
    setFormData((prev) => ({ ...prev, currentInstruction: "" }));
    // navigate("/recipe");
  };

  // Function to validate all fields are filled
  const isFormValid = () => {
    return (
      formData.recipeName &&
      formData.cuisine &&
      formData.totalServings &&
      formData.preparationTime &&
      tableData &&
      Array.isArray(tableData) &&
      tableData.length > 0
    );
  };

  const [isImageAdded, setIsImageAdded] = useState(false);

  const handleImageAdded = () => {
    setIsImageAdded(true);
  };

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  //==================== Render the component ====================
  return (
    <FramerClient>
      <div
        id="no-bg"
        className="w-full flex justify-center items-center bg-[#FFFEFE]"
      >
        <form
          onSubmit={sendDataToSupabase}
          id="no-bg"
          className="w-full min-h-screen flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12"
        >
          <div
            id="no-bg"
            className="w-full sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[80%] max-w-[1400px] bg-[#FFFFFF] rounded-lg flex flex-col sm:flex-row  border border-[#005BBB]"
          >
            {/* Main Form Area - full width on mobile, constrained on larger screens */}
            <div
              id="no-bg"
              className="w-full  p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12"
            >
              {/* Header - flex column on mobile, row on sm+ */}
              <div
                id="no-bg"
                //className="flex flex-col bg-[#E8F1FF] sm:flex-row justify-between items-center mb-6 sm:mb-8 md:mb-10 lg:mb-12"
              >
                <div id="no-bg" className="w-full flex justify-center">
                  <h1
                    id="no-bg"
                    className="font-[Arial] text-2xl sm:text-3xl md:text-4xl lg:text-5xl  font-medium text-center sm:text-left mb-4 sm:mb-0 text-[#1A1A1A]"
                  >
                    Create Recipe
                  </h1>
                </div>
              </div>
              {/* Recipe Description Section */}
              <div
                id="no-bg"
                className="bg-[#d8edfd] rounded-lg p-4 sm:p-6 mb-6 sm:mb-8  border border-[#005BBB]"
              >
                <h2
                  id="no-bg"
                  className="font-[Arial] text-lg sm:text-xl md:text-2xl font-medium mb-4 sm:mb-6"
                >
                  Recipe Description
                </h2>
                <div
                  id="no-bg"
                  className="flex flex-col gap-6 w-full"
                >
                  <div
                    id="no-bg"
                    className="flex flex-col justify-start items-start gap-4 sm:gap-6 w-full"
                  >
                    <div
                      id="no-bg"
                      className="flex flex-col w-full gap-2"
                    >
                      <label
                        id="no-bg"
                        className="font-[Arial] text-lg sm:text-base md:text-lg "
                      >
                        Recipe Name
                      </label>
                      <input
                        id="no-bg"
                        className="w-full rounded-xl h-10 sm:h-12 border border-gray-400 px-4"
                        placeholder="Enter Recipe Name"
                        value={formData.recipeName}
                        onChange={(e) => handleFieldChange("recipeName", e.target.value)}
                      />
                    </div>

                    <div
                      id="no-bg"
                       className="flex flex-col w-full gap-2"
                    >
                      <label
                        id="no-bg"
                        className="font-[Arial] text-sm sm:text-base md:text-lg"
                      >
                        Cuisine Type
                      </label>
                      <select
                        id="no-bg"
                        className="w-full rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                        value={formData.cuisine}
                        onChange={(e) => handleFieldChange("cuisine", e.target.value)}
                      >
                        <option value="">Select Cuisine Type</option>
                        {cuisineOptions}
                      </select>
                    </div>
                  </div>

                  <div
                    id="no-bg"
                    className="flex flex-col w-full gap-3 mt-2"
                  >
                    <label
                      id="no-bg"
                      className="font-[Arial] text-sm sm:text-base md:text-lg sm:mr-4"
                    >
                      Add Image
                    </label>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      id="file-upload"
                      accept="image/*"
                      //onChange={(e) => setImage(e.target.files[0])}
                      className="hidden"
                    />

                    {/* Styled label as button */}
                    <label
                      htmlFor="file-upload"
                      id="no-bg"
                      className="font-[Arial] bg-[#005BBB] text-white px-4 sm:px-6 py-3 sm:py-6 rounded-full font-semibold text-sm sm:text-base cursor-pointer w-fit"
                    >
                      Upload
                    </label>
                  </div>
                </div>
              </div>
              {/* Cooking Description Section */}
              <div
                id="no-bg"
                className="bg-[#d8edfd] rounded-lg p-4 sm:p-6 mb-6 sm:mb-8  border border-[#005BBB]"
              >
                <h2
                  id="no-bg"
                  className="font-[Arial] text-lg sm:text-xl md:text-2xl font-medium mb-4 sm:mb-6"
                >
                  Cooking Description
                </h2>
                <div id="no-bg" 
                className="flex flex-col gap-6 w-full"
                >
                  <div
                    id="no-bg"
                    className="flex flex-col w-full gap-2"
                  >
                    <label
                      id="no-bg"
                      className="font-[Arial] text-lg sm:text-base md:text-lg"
                    >
                      Preparation Time
                    </label>
                    <input
                      id="no-bg"
                       className="w-full rounded-xl h-10 sm:h-12 border border-gray-400 px-4"
                      placeholder="e.g.,   30 minutes"
                      value={formData.preparationTime}
                      onChange={(e) =>
                        handleFieldChange("preparationTime", e.target.value)
                      }
                    />
                  </div>

                  <div
                    id="no-bg"
                    className="flex flex-col w-full gap-2"
                  >
                    <label
                      id="no-bg"
                      className="font-[Arial] text-sm sm:text-base md:text-lg"
                    >
                      Total Servings
                    </label>
                    <input
                      id="no-bg"
                      className="w-full rounded-xl h-10 sm:h-12 border border-gray-400 px-4"
                      placeholder="e.g.,  2 servings"
                      value={formData.totalServings}
                      onChange={(e) =>
                        handleFieldChange("totalServings", e.target.value)
                      }
                    />
                  </div>

                  <div
                    id="no-bg"
                    className="flex flex-col w-full gap-2"
                  >
                    <label
                      id="no-bg"
                      className="font-[Arial] text-sm sm:text-base md:text-lg"
                    >
                      Cooking Method
                    </label>
                    <select
                      id="no-bg"
                      className="w-full rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                      value={formData.cookingMethod}
                      onChange={(e) =>
                        handleFieldChange("cookingMethod", e.target.value)
                      }
                    >
                      <option value="">Select Cooking Method</option>
                      {cookingMethodOptions}
                    </select>
                  </div>
                </div>
              </div>

              {/* Ingredients Section */}
              <div
                id="no-bg"
                className="bg-[#d8edfd] rounded-lg p-4 sm:p-6 mb-6 sm:mb-8  border border-[#005BBB]"
              >
                <div className="w-full flex justify-between items-center">
                  <h2
                    id="no-bg"
                    className="font-[Arial] text-lg sm:text-xl md:text-2xl font-medium mb-4 sm:mb-6"
                  >
                    Ingredients
                  </h2>
                  {showIngredients ? (
                    <MdArrowDropUp
                      size={24}
                      className="cursor-pointer text-black"
                      onClick={() => setShowIngredients(!showIngredients)}
                    />
                  ) : (
                    <MdArrowDropDown
                      size={24}
                      className="cursor-pointer text-black"
                      onClick={() => setShowIngredients(!showIngredients)}
                    />
                  )}
                </div>
                {showIngredients && (
                  <FramerClient>
                    <div
                      id="no-bg"
                     className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6"
                    >
                      <div
                        id="no-bg"
                        className="flex flex-col w-full sm:w-1/2"
                      >
                        <label
                          id="no-bg"
                          className="font-[Arial] text-sm sm:text-base md:text-lg mb-1"
                        >
                          Category
                        </label>
                        <select
                          id="no-bg"
                          className="w-full sm:w-2/3 rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                          defaultValue=""
                          onChange={(e) =>
                            handleFieldChange("ingredientCategory", e.target.value)
                          }
                          value={formData.ingredientCategory}
                        >
                          <option value="" disabled>
                            Select one
                          </option>
                          <option value="meat">Meat</option>
                          <option value="vegetables">Vegetables</option>
                          <option value="grains">Grains</option>
                          <option value="carbs">Carbs</option>
                          <option value="dairy">Dairy</option>
                          <option value="spices">Spices</option>
                        </select>
                      </div>

                      <div
                        id="no-bg"
                        className="flex flex-col w-full sm:w-1/2"
                      >
                        <label
                          id="no-bg"
                          className="font-[Arial] text-lg sm:text-base md:text-lg mb-2"
                        >
                          Ingredient Name
                        </label>
                        <select
                          id="no-bg"
                          className="w-full sm:w-2/3 rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                          value={formData.ingredient}
                          onChange={(e) =>
                            handleFieldChange("ingredient", e.target.value)
                          }
                        >
                          <option value="">Select Ingredient</option>
                          {ingredientOptions}
                        </select>
                      </div>
                    </div>

                    <div
                      id="no-bg"
                      className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8 w-full"
                    >
                      <div
                        id="no-bg"
                        className="flex flex-col w-full sm:w-1/2"
                      >
                        <label
                          id="no-bg"
                          className="font-[Arial] text-lg sm:text-base md:text-lg mb-1"
                        >
                          Quantity
                        </label>
                        <div className="flex items-center w-full sm:w-2/3 space-x-2">
                          <input
                            id="no-bg"
                            //list="units"
                            className="w-full sm:w-2/3 rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                            defaultValue=""
                            value={formData.ingredientQuantity}
                            onChange={(e) =>
                              handleFieldChange("ingredientQuantity", e.target.value)
                            }
                          />
                          {/*      <datalist id="units">
                          <option value="ml" />
                          <option value="g" />
                          <option value="cups" />
                          <option value="tbsp" />
                          <option value="tsp" />
                        </datalist> */}
                          <select
                            id="no-bg"
                            className="w-full sm:w-2/3 rounded-xl h-10 sm:h-12 border border-gray-400 px-4 bg-white"
                            defaultValue=""
                            /*   value={ingredientQuantity}
                            onChange={(e) =>
                              handleIngredientQuantityChange(e.target.value)
                            } */
                          >
                            <option value="" disabled>
                              Select one
                            </option>
                            <option value="ml">Ml</option>
                            <option value="g">G</option>
                            <option value="cups">Cups</option>
                            <option value="tbsp">Tbsp</option>
                            <option value="tsp"></option>
                          </select>
                        </div>
                      </div>

                      <div
                        id="no-bg"
                        className="flex items-center justify-start sm:justify-start sm:w-1/2"
                      >
                        <button
                          type="button"
                          id="no-bg"
                          className="font-[Arial] bg-[#005BBB] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base"
                          onClick={() => handelIngredientsInTable()}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <div id="no-bg" className="overflow-x-auto">
                      <table
                        id="no-bg"
                        className="min-w-full border border-gray-300"
                      >
                        <thead id="no-bg" className="bg-[#005BBB] text-white">
                          <tr>
                            <th
                              id="no-bg"
                              className="font-[Arial] border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                            >
                              Category
                            </th>
                            <th
                              id="no-bg"
                              className="font-[Arial] border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                            >
                              Ingredient
                            </th>
                            <th
                              id="no-bg"
                              className="font-[Arial] border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                            >
                              Quantity
                            </th>
                            <th
                              id="no-bg"
                              className="font-[Arial] border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredients.map((item, index) => (
                            <motion.tr
                              id="no-bg"
                              className="bg-[#F4F4F4]"
                              key={index}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <td
                                id="no-bg"
                                className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                              >
                                {item.ingredientCategory}
                              </td>
                              <td
                                id="no-bg"
                                className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                              >
                                {item.ingredient}
                              </td>
                              <td
                                id="no-bg"
                                className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                              >
                                {item.ingredientQuantity}
                              </td>
                              <td
                                id="no-bg"
                                className="border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base"
                              >
                                {item.ingredientCategory &&
                                  item.ingredient &&
                                  item.ingredientQuantity && (
                                    <div className="flex justify-center items-center gap-x-4">
                                      <div
                                        id="no-bg"
                                        className="text-red-500 cursor-pointer"
                                        onClick={() => {
                                          setIngredients((prev) =>
                                            prev.filter((_, i) => i !== index)
                                          );
                                        }}
                                      >
                                        <RiDeleteBin6Fill
                                          className="text-black"
                                          size={24}
                                        />
                                      </div>
                                      <div
                                        id="no-bg"
                                        className="text-blue-500 mr-2 cursor-pointer"
                                        onClick={() => {
                                          setFormData((prev) => ({
                                            ...prev,
                                            ingredientCategory: item.ingredientCategory,
                                            ingredient: item.ingredient,
                                            ingredientQuantity: item.ingredientQuantity,
                                          }));
                                          setIngredients((prev) =>
                                            prev.filter((_, i) => i !== index)
                                          );
                                        }}
                                      >
                                        <MdEdit
                                          className="text-black"
                                          size={24}
                                        />
                                      </div>
                                    </div>
                                  )}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </FramerClient>
                )}
              </div>

              {/* Instructions Section */}
              <div
                id="no-bg"
                className="bg-[#d8edfd] rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 w-full  border border-[#005BBB]"
              >
                <h2
                  id="no-bg"
                  className="font-[Arial] text-lg sm:text-xl md:text-2xl font-medium mb-4 sm:mb-6"
                >
                  Instructions
                </h2>
                {instruction.length > 0 && (
                  <div className="mt-4 w-full">
                    {instruction.map((item, index) => (
                      <FramerClient key={index}>
                        <div
                          id="no-bg"
                          className="w-full flex flex-col justify-start sm:flex-row mb-4 sm:mb-6"
                        >
                          <div id="no-bg" className="w-full sm:w-1/6">
                            <button
                              type="button"
                              id="no-bg"
                              className="w-full bg-[#005BBB] text-white py-2 sm:py-3 px-4 font-semibold text-sm sm:text-base"
                            >
                              Step {index + 1}:
                            </button>
                          </div>
                          <div className="flex justify-start items-center w-full sm:w-3/4">
                            <input
                              id="no-bg"
                              className="w-full sm:w-3/4 h-full py-2 sm:py-3 px-4 bg-white"
                              placeholder="Enter step by step instructions here..."
                              value={item}
                              disabled
                            />
                            <div className="w-full -ml-[8px] bg-white text-black px-2 sm:px-3 py-1 sm:py-2 cursor-pointer flex items-center justify-end h-full gap-4">
                              <RiDeleteBin6Fill
                                onClick={() => {
                                  setInstruction((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  );
                                }}
                              />
                              <MdEdit
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    currentInstruction: item,
                                  }));
                                  setInstruction((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </FramerClient>
                    ))}
                  </div>
                )}

                <FramerClient>
                  <div
                    id="no-bg"
                    className="w-full flex flex-col justify-start sm:flex-row mb-4 sm:mb-6"
                  >
                    <div id="no-bg" className="w-full sm:w-1/6">
                      <button
                        type="button"
                        id="no-bg"
                        className="w-full bg-[#005BBB] text-white py-2 sm:py-3 px-4 font-semibold text-sm sm:text-base"
                      >
                        Step {instruction.length + 1}:
                      </button>
                    </div>
                    <input
                      id="no-bg"
                      className="w-full -ml-[8px] sm:w-3/4 border border-gray-400 py-2 sm:py-3 px-4"
                      placeholder="Enter step by step instructions here..."
                      value={formData.currentInstruction}
                      onChange={(e) => handleFieldChange("currentInstruction", e.target.value)}
                    />
                  </div>

                  <div id="no-bg" 
                  className="flex items-center justify-start sm:justify-start sm:w-1/2"
                  >
                    <button
                      id="no-bg"
                      type="button"
                      className="font-[Arial] bg-[#005BBB] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base"
                      onClick={() => {
                        setInstruction((prev) => [...prev, formData.currentInstruction]);
                        setFormData((prev) => ({ ...prev, currentInstruction: "" }));
                      }}
                    >
                      Add
                    </button>
                  </div>
                </FramerClient>
              </div>

              {/* Submit Button */}
              <div id="no-bg" className="flex justify-center">
                <button
                  type="submit"
                  id="no-bg"
                  // disabled={!instructions.trim()}
                  className="font-[Arial] bg-[#005BBB] text-white w-full max-w-xs px-8 py-3 rounded-full font-semibold text-lg shadow-xl shadow-blue-800/50  hover:bg-[#003f8a] transition duration-300"
                  onClick={sendDataToSupabase}
                >
                  Save  Recipe
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </FramerClient>
  );
}

export default CreateRecipe;
