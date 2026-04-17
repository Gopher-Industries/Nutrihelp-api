// src/routes/SearchRecipes/recipesData.js

import chineseImg from "../../images/chinese.jpg";
import indianImg from "../../images/indian.jpg";
import mexicanImg from "../../images/mexican.jpg";
import saladsImg from "../../images/salads.jpg";
import thaiImg from "../../images/thai.jpg";
import italianImg from "../../images/italian.jpg";
import middleEasternImg from "../../images/middle_eastern.jpg";
import dessertsImg from "../../images/desserts.jpg";

export const recipesData = {
  Chinese: [
    {
      id: 1,
      recipe_name: "Kung Pao Chicken",
      recipe_image: chineseImg,
      cuisine_name: "Chinese",
      instructions:
        "1. Marinate diced chicken in soy sauce and cornstarch for 15 min.\n" +
        "2. Stir-fry garlic, ginger, and dried chilies for 30 sec.\n" +
        "3. Add chicken, peanuts, and sauce; cook until glossy.\n" +
        "4. Garnish with scallions and serve hot.",
      preparation_time: "25 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Chicken breast", quantity: "200 g, diced" },
        { id: 2, name: "Peanuts", quantity: "50 g" },
        { id: 3, name: "Dried red chilies", quantity: "5" },
      ],
    },
    {
      id: 2,
      recipe_name: "Sweet and Sour Pork",
      recipe_image: chineseImg,
      cuisine_name: "Chinese",
      instructions:
        "1. Cube pork and toss in flour; deep-fry until golden brown.\n" +
        "2. Sauté bell peppers, onion, and pineapple chunks.\n" +
        "3. Add pork plus vinegar, ketchup, sugar, and soy; simmer 5 min.\n" +
        "4. Thicken sauce, plate, and serve with rice.",
      preparation_time: "30 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Pork shoulder", quantity: "250 g, cubed" },
        { id: 2, name: "Bell pepper", quantity: "1, sliced" },
        { id: 3, name: "Pineapple chunks", quantity: "⅓ cup" },
      ],
    },
    {
      id: 3,
      recipe_name: "Vegetable Fried Rice",
      recipe_image: chineseImg,
      cuisine_name: "Chinese",
      instructions:
        "1. Cook and cool 2 cups of rice.\n" +
        "2. Stir-fry mixed veggies in oil for 3 min.\n" +
        "3. Add rice, soy sauce, and sesame oil; toss well.\n" +
        "4. Sprinkle scallions and serve.",
      preparation_time: "20 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Cooked rice", quantity: "2 cups" },
        { id: 2, name: "Mixed vegetables", quantity: "1 cup" },
        { id: 3, name: "Soy sauce", quantity: "2 tbsp" },
      ],
    },
  ],

  Indian: [
    {
      id: 1,
      recipe_name: "Butter Chicken",
      recipe_image: indianImg,
      cuisine_name: "Indian",
      instructions:
        "1. Marinate chicken in yogurt, spices, and lemon for 1 hr.\n" +
        "2. Sauté onions, garlic, and ginger; add tomato puree.\n" +
        "3. Add chicken and simmer 20 min; stir in butter and cream.\n" +
        "4. Garnish with cilantro; serve with naan.",
      preparation_time: "1 hr 20 mins",
      total_servings: "4 servings",
      ingredients: [
        { id: 1, name: "Chicken thighs", quantity: "500 g" },
        { id: 2, name: "Yogurt", quantity: "½ cup" },
        { id: 3, name: "Butter", quantity: "50 g" },
      ],
    },
    {
      id: 2,
      recipe_name: "Chana Masala",
      recipe_image: indianImg,
      cuisine_name: "Indian",
      instructions:
        "1. Sauté onions, ginger, and garlic until golden.\n" +
        "2. Add spices and tomato; cook 5 min.\n" +
        "3. Stir in chickpeas and water; simmer 15 min.\n" +
        "4. Garnish with cilantro; serve with rice.",
      preparation_time: "40 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Canned chickpeas", quantity: "400 g" },
        { id: 2, name: "Tomato puree", quantity: "1 cup" },
        { id: 3, name: "Chana masala spice mix", quantity: "2 tbsp" },
      ],
    },
    {
      id: 3,
      recipe_name: "Aloo Gobi",
      recipe_image: indianImg,
      cuisine_name: "Indian",
      instructions:
        "1. Fry cumin seeds in oil until they sizzle.\n" +
        "2. Add potatoes and cauliflower; sauté 5 min.\n" +
        "3. Stir in turmeric, coriander, and chili powder.\n" +
        "4. Cook covered 15 min; garnish and serve.",
      preparation_time: "30 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Potato", quantity: "1 medium, cubed" },
        { id: 2, name: "Cauliflower", quantity: "1 small, florets" },
        { id: 3, name: "Turmeric powder", quantity: "1 tsp" },
      ],
    },
  ],

  Mexican: [
    {
      id: 1,
      recipe_name: "Chicken Tacos",
      recipe_image: mexicanImg,
      cuisine_name: "Mexican",
      instructions:
        "1. Season and grill chicken strips 6 min per side.\n" +
        "2. Warm tortillas, fill with chicken, lettuce, and cheese.\n" +
        "3. Top with salsa, sour cream, and cilantro.\n" +
        "4. Serve immediately.",
      preparation_time: "30 mins",
      total_servings: "4 tacos",
      ingredients: [
        { id: 1, name: "Chicken breast", quantity: "300 g, sliced" },
        { id: 2, name: "Tortillas", quantity: "4" },
        { id: 3, name: "Shredded cheese", quantity: "½ cup" },
      ],
    },
    {
      id: 2,
      recipe_name: "Beef Enchiladas",
      recipe_image: mexicanImg,
      cuisine_name: "Mexican",
      instructions:
        "1. Brown ground beef with onion and spices.\n" +
        "2. Roll beef in tortillas, place in baking dish.\n" +
        "3. Top with enchilada sauce and cheese.\n" +
        "4. Bake 20 min at 180 °C; garnish and serve.",
      preparation_time: "45 mins",
      total_servings: "6 enchiladas",
      ingredients: [
        { id: 1, name: "Ground beef", quantity: "400 g" },
        { id: 2, name: "Enchilada sauce", quantity: "1 cup" },
        { id: 3, name: "Tortillas", quantity: "6" },
      ],
    },
    {
      id: 3,
      recipe_name: "Guacamole",
      recipe_image: mexicanImg,
      cuisine_name: "Mexican",
      instructions:
        "1. Mash avocados in a bowl.\n" +
        "2. Stir in lime juice, onion, tomato, and cilantro.\n" +
        "3. Season with salt and pepper.\n" +
        "4. Serve with tortilla chips.",
      preparation_time: "15 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Avocados", quantity: "2, ripe" },
        { id: 2, name: "Lime juice", quantity: "2 tbsp" },
        { id: 3, name: "Cilantro", quantity: "2 tbsp, chopped" },
      ],
    },
  ],

  Salads: [
    {
      id: 1,
      recipe_name: "Greek Salad",
      recipe_image: saladsImg,
      cuisine_name: "Salads",
      instructions:
        "1. Chop tomatoes, cucumber, red onion, and olives.\n" +
        "2. Toss with olive oil, oregano, and salt.\n" +
        "3. Top with feta cheese.\n" +
        "4. Serve chilled.",
      preparation_time: "15 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Tomatoes", quantity: "2, chopped" },
        { id: 2, name: "Cucumber", quantity: "1, sliced" },
        { id: 3, name: "Feta cheese", quantity: "100 g" },
      ],
    },
    {
      id: 2,
      recipe_name: "Caesar Salad",
      recipe_image: saladsImg,
      cuisine_name: "Salads",
      instructions:
        "1. Toss romaine lettuce with Caesar dressing.\n" +
        "2. Add croutons and grated Parmesan.\n" +
        "3. Season with black pepper.\n" +
        "4. Serve immediately.",
      preparation_time: "10 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Romaine lettuce", quantity: "1 head" },
        { id: 2, name: "Caesar dressing", quantity: "¼ cup" },
        { id: 3, name: "Croutons", quantity: "½ cup" },
      ],
    },
    {
      id: 3,
      recipe_name: "Caprese Salad",
      recipe_image: saladsImg,
      cuisine_name: "Salads",
      instructions:
        "1. Slice tomatoes and mozzarella.\n" +
        "2. Layer with basil leaves.\n" +
        "3. Drizzle with balsamic glaze and olive oil.\n" +
        "4. Season with salt and serve.",
      preparation_time: "10 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Tomatoes", quantity: "2, sliced" },
        { id: 2, name: "Mozzarella", quantity: "125 g, sliced" },
        { id: 3, name: "Basil leaves", quantity: "Handful" },
      ],
    },
  ],

  Thai: [
    {
      id: 1,
      recipe_name: "Pad Thai",
      recipe_image: thaiImg,
      cuisine_name: "Thai",
      instructions:
        "1. Soak rice noodles in warm water 10 min.\n" +
        "2. Stir-fry tofu and garlic in oil.\n" +
        "3. Add noodles, tamarind paste, fish sauce, and sugar.\n" +
        "4. Toss with bean sprouts and peanuts; serve.",
      preparation_time: "25 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Rice noodles", quantity: "200 g" },
        { id: 2, name: "Tamarind paste", quantity: "2 tbsp" },
        { id: 3, name: "Bean sprouts", quantity: "1 cup" },
      ],
    },
    {
      id: 2,
      recipe_name: "Green Curry",
      recipe_image: thaiImg,
      cuisine_name: "Thai",
      instructions:
        "1. Sauté green curry paste in coconut oil.\n" +
        "2. Add coconut milk and bring to simmer.\n" +
        "3. Stir in chicken and vegetables; cook 10 min.\n" +
        "4. Garnish with basil and serve with rice.",
      preparation_time: "30 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Green curry paste", quantity: "3 tbsp" },
        { id: 2, name: "Coconut milk", quantity: "400 ml" },
        { id: 3, name: "Chicken breast", quantity: "300 g, sliced" },
      ],
    },
    {
      id: 3,
      recipe_name: "Tom Yum Soup",
      recipe_image: thaiImg,
      cuisine_name: "Thai",
      instructions:
        "1. Boil lemongrass, kaffir lime, and galangal in water.\n" +
        "2. Add shrimp and mushrooms; cook 3 min.\n" +
        "3. Stir in fish sauce and lime juice.\n" +
        "4. Garnish with cilantro and serve hot.",
      preparation_time: "20 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Shrimp", quantity: "200 g" },
        { id: 2, name: "Mushrooms", quantity: "100 g, sliced" },
        { id: 3, name: "Lemongrass", quantity: "1 stalk" },
      ],
    },
  ],

  Italian: [
    {
      id: 1,
      recipe_name: "Spaghetti Carbonara",
      recipe_image: italianImg,
      cuisine_name: "Italian",
      instructions:
        "1. Cook spaghetti until al dente.\n" +
        "2. Whisk eggs and Parmesan in a bowl.\n" +
        "3. Stir-fry pancetta until crispy.\n" +
        "4. Toss pasta with pancetta and egg mixture off heat.",
      preparation_time: "20 mins",
      total_servings: "2 servings",
      ingredients: [
        { id: 1, name: "Spaghetti", quantity: "200 g" },
        { id: 2, name: "Eggs", quantity: "2" },
        { id: 3, name: "Parmesan cheese", quantity: "½ cup, grated" },
      ],
    },
    {
      id: 2,
      recipe_name: "Margherita Pizza",
      recipe_image: italianImg,
      cuisine_name: "Italian",
      instructions:
        "1. Spread tomato sauce on pizza dough.\n" +
        "2. Add mozzarella slices and basil leaves.\n" +
        "3. Bake at 220 °C for 12–15 min.\n" +
        "4. Drizzle with olive oil and serve.",
      preparation_time: "25 mins",
      total_servings: "1 pizza",
      ingredients: [
        { id: 1, name: "Pizza dough", quantity: "1 ball" },
        { id: 2, name: "Tomato sauce", quantity: "½ cup" },
        { id: 3, name: "Mozzarella", quantity: "125 g, sliced" },
      ],
    },
    {
      id: 3,
      recipe_name: "Lasagna",
      recipe_image: italianImg,
      cuisine_name: "Italian",
      instructions:
        "1. Layer pasta sheets, meat sauce, and béchamel in baking dish.\n" +
        "2. Repeat layers and top with cheese.\n" +
        "3. Bake 30–35 min at 180 °C.\n" +
        "4. Let rest 5 min before serving.",
      preparation_time: "1 hr",
      total_servings: "6 servings",
      ingredients: [
        { id: 1, name: "Lasagna sheets", quantity: "9" },
        { id: 2, name: "Ground beef", quantity: "400 g" },
        { id: 3, name: "Béchamel sauce", quantity: "1 cup" },
      ],
    },
  ],

  "Middle Eastern": [
    {
      id: 1,
      recipe_name: "Hummus & Pita",
      recipe_image: middleEasternImg,
      cuisine_name: "Middle Eastern",
      instructions:
        "1. Blend chickpeas, tahini, garlic, and lemon juice.\n" +
        "2. Drizzle with olive oil and sprinkle paprika.\n" +
        "3. Serve with warm pita bread.",
      preparation_time: "15 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Canned chickpeas", quantity: "400 g" },
        { id: 2, name: "Tahini", quantity: "2 tbsp" },
        { id: 3, name: "Garlic", quantity: "2 cloves" },
      ],
    },
    {
      id: 2,
      recipe_name: "Falafel Wrap",
      recipe_image: middleEasternImg,
      cuisine_name: "Middle Eastern",
      instructions:
        "1. Blend chickpeas, onion, garlic, and spices; form balls.\n" +
        "2. Fry until golden brown.\n" +
        "3. Stuff into pita with salad and tahini sauce.\n" +
        "4. Serve immediately.",
      preparation_time: "40 mins",
      total_servings: "4 wraps",
      ingredients: [
        { id: 1, name: "Dried chickpeas", quantity: "250 g" },
        { id: 2, name: "Onion", quantity: "1 small" },
        { id: 3, name: "Cumin powder", quantity: "1 tsp" },
      ],
    },
    {
      id: 3,
      recipe_name: "Tabbouleh",
      recipe_image: middleEasternImg,
      cuisine_name: "Middle Eastern",
      instructions:
        "1. Soak bulgur in water 15 min; drain.\n" +
        "2. Chop parsley, mint, tomato, and cucumber.\n" +
        "3. Toss with olive oil and lemon juice.\n" +
        "4. Season with salt and serve cold.",
      preparation_time: "20 mins",
      total_servings: "3 servings",
      ingredients: [
        { id: 1, name: "Bulgur", quantity: "1 cup" },
        { id: 2, name: "Parsley", quantity: "1 bunch, chopped" },
        { id: 3, name: "Mint", quantity: "½ bunch, chopped" },
      ],
    },
  ],

  Desserts: [
    {
      id: 1,
      recipe_name: "Chocolate Brownies",
      recipe_image: dessertsImg,
      cuisine_name: "Desserts",
      instructions:
        "1. Melt butter and chocolate together.\n" +
        "2. Stir in sugar, eggs, and vanilla.\n" +
        "3. Fold in flour and salt.\n" +
        "4. Bake at 180 °C for 25 min; cool before slicing.",
      preparation_time: "40 mins",
      total_servings: "9 brownies",
      ingredients: [
        { id: 1, name: "Dark chocolate", quantity: "200 g" },
        { id: 2, name: "Butter", quantity: "100 g" },
        { id: 3, name: "Sugar", quantity: "200 g" },
      ],
    },
    {
      id: 2,
      recipe_name: "Tiramisu",
      recipe_image: dessertsImg,
      cuisine_name: "Desserts",
      instructions:
        "1. Dip ladyfingers in espresso.\n" +
        "2. Layer with mascarpone mixture.\n" +
        "3. Repeat layers and dust with cocoa powder.\n" +
        "4. Chill 2 hrs before serving.",
      preparation_time: "3 hrs",
      total_servings: "6 servings",
      ingredients: [
        { id: 1, name: "Ladyfingers", quantity: "200 g" },
        { id: 2, name: "Mascarpone", quantity: "250 g" },
        { id: 3, name: "Espresso", quantity: "1 cup" },
      ],
    },
    {
      id: 3,
      recipe_name: "Fruit Tart",
      recipe_image: dessertsImg,
      cuisine_name: "Desserts",
      instructions:
        "1. Blind-bake tart shell 15 min at 180 °C.\n" +
        "2. Fill with pastry cream.\n" +
        "3. Arrange sliced fruits on top.\n" +
        "4. Glaze with warmed apricot jam.",
      preparation_time: "1 hr",
      total_servings: "8 slices",
      ingredients: [
        { id: 1, name: "Tart shell", quantity: "1 pre‐made" },
        { id: 2, name: "Pastry cream", quantity: "1 cup" },
        { id: 3, name: "Mixed fruits", quantity: "2 cups, sliced" },
      ],
    },
  ],
};
