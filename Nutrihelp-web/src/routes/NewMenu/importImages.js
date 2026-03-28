import oatmealImage from '../../images/menupage_img/menup_oatmeal.jpg';
import omeleteImage from '../../images/menupage_img/menup_omelete.jpg';
import berrySmoothieImage from '../../images/menupage_img/menup_berrySmoothie.jpg';
import vegetableStirFryImage from '../../images/menupage_img/menup_vegetable.jpg';
import chocolateCakeImage from '../../images/menupage_img/menup_chocolateCake.jpg';
import quinoaSaladImage from '../../images/menupage_img/menup_quinoaSalad.jpg';
import chickenWingsImage from '../../images/menupage_img/menup_chickenWings.jpg';
import hotdogImage from '../../images/menupage_img/menup_hotdog.jpg';
import broccoliImage from '../../images/menupage_img/menup_broccoli.jpg';
import avocadoImage from '../../images/menupage_img/menup_avocado.jpg';
import salmonImage from '../../images/menupage_img/menup_salmon.jpg';
import oatmeal2Image from '../../images/menupage_img/menup_oatmeal2.jpg';

const imageMapping = {
  Oatmeal: {
    image: oatmealImage,
    title: 'Creamy Berry Oatmeal',
    description: 'Start your day right with this creamy berry oatmeal recipe! Packed with protein-rich Greek yogurt, crunchy pecans, and naturally sweet berries, this breakfast is both nutritious and delicious. Perfect for busy mornings, try our overnight oatmeal variation for a quick and easy meal.',
    recipeLink: 'https://www.eatingwell.com/recipe/268775/cinnamon-roll-overnight-oats/',
  },
  Omelete: {
    image: omeleteImage,
    title: 'Veggie Omelet',
    description: 'Enjoy a nutritious start to your day with our Veggie-Packed Omelet, featuring tender broccoli, savory mushrooms, and sweet red banana peppers. This flavorful omelet combines fresh vegetables with perfectly cooked eggs for a satisfying and healthy breakfast option. Ideal for a quick, wholesome meal that energizes you for the day ahead.',
    recipeLink: 'https://www.eatingwell.com/recipe/262895/vegetable-filled-omelets/',
  },

  'Berry Smoothie': {
    image: berrySmoothieImage,
    title: 'Berry Smoothie',
    description: 'A refreshing smoothie made with mixed berries.',
    recipeLink: 'https://www.eatingwell.com/strawberry-smoothie-recipes-to-make-forever-8684787',
  },
  'Vegetable Stir-Fry': {
    image: vegetableStirFryImage,
    title: 'Vegetable Stir-Fry',
    description: 'A stir-fry made with a mix of fresh vegetables.',
    recipeLink: 'https://www.eatingwell.com/recipes/19377/cooking-methods-styles/stir-fry/vegetables/',
  },
  'Chocolate Cake': {
    image: chocolateCakeImage,
    title: 'Chocolate Cake',
    description: 'A rich and moist chocolate cake with frosting.',
    recipeLink: 'https://www.eatingwell.com/recipes/21406/low-calorie/desserts/cake/chocolate/',
  },
  'Quinoa Salad': {
    image: quinoaSaladImage,
    title: 'Quinoa Salad',
    description: 'A nutritious salad made with quinoa and fresh vegetables.',
    recipeLink: 'https://www.eatingwell.com/recipe/250475/cherry-wild-rice-quinoa-salad/',
  },
  'Chicken Wings': {
    image: chickenWingsImage,
    title: 'Baked Buffalo Wings',
    description: 'Spicy and crispy chicken wings, perfect for snacking.',
    recipeLink: 'https://www.eatingwell.com/gallery/8024486/wing-recipes-for-super-bowl-sunday/',
  },
  Hotdog: {
    image: hotdogImage,
    title: 'BBQ Carrot hot Dog',
    description: 'A classic hotdog, great for a quick and satisfying meal.',
    recipeLink: 'https://www.eatingwell.com/recipe/257875/bbq-carrot-dogs/',
  },
  Broccoli: {
    image: broccoliImage,
    title: 'Loaded Broccoli Salad',
    description: 'A healthy vegetable rich in vitamins and fiber.',
    recipeLink: 'https://www.eatingwell.com/recipe/7962130/loaded-broccoli-salad/',
  },
  Avocado: {
    image: avocadoImage,
    title: 'Loaded Baked Avocados',
    description: 'A creamy fruit, perfect for salads and toast.',
    recipeLink: 'https://www.eatingwell.com/recipe/7870116/loaded-baked-avocados/',
  },
  Salmon: {
    image: salmonImage,
    title: 'Ginger Roasted Salmon',
    description: 'A nutritious fish high in omega-3 fatty acids.',
    recipeLink: 'https://www.eatingwell.com/recipe/267640/ginger-roasted-salmon-broccoli/',
  },
  Oatmeal2: {
    image: oatmeal2Image,
    title: 'Cinnamon Roll Oats',
    description: 'Another variant of healthy oatmeal.',
    recipeLink: 'https://www.eatingwell.com/recipe/268775/cinnamon-roll-overnight-oats/',
  },
  'Greek Yogurt Parfait': {
    title: 'Greek Yogurt Parfait',
    description:'A refreshing layered blend of creamy Greek yogurt, crunchy granola, and fresh berries.',
    recipeLink: 'https://foolproofliving.com/layered-yogurt-parfait/',
 
  },
  'Avocado Toast':
  {
    title: 'Avocado Toast',
    description:'Toasted bread topped with creamy mashed avocado, a dash of lemon, and a sprinkle of seasoning.',
    recipeLink: 'https://cookieandkate.com/avocado-toast-recipe/',
 
  },
  'Grilled Chicken Salad':
  {
    title: 'Grilled Chicken Salad',
    description:'Juicy grilled chicken served over a bed of crisp greens, fresh veggies, and a light vinaigrette for a protein-packed, wholesome meal.',
    recipeLink: 'https://www.delish.com/cooking/recipe-ideas/a21097616/grilled-chicken-salad-recipe/',
 
  },
  'Pasta Primavera':
  {
    title: 'Pasta Primavera',
    description:'A vibrant medley of seasonal vegetables tossed with tender pasta and a light garlic-herb sauce.',
    recipeLink: 'https://www.loveandlemons.com/pasta-primavera/',
 
  },
  'Stir-Fried Tofu Bowl':
  {
    title: 'Stir-Fried Tofu Bowl',
    description:'Tofu stir-fried with colorful vegetables and savory sauce, served over rice or grains for a hearty and plant-based dinner option.',
    recipeLink: 'https://rainbowplantlife.com/tofu-stir-fry/',
 
  },
  'Baked Sweet Potatoes':
  {
    title: 'Baked Sweet Potatoes',
    description:'Tender, naturally sweet potatoes baked to perfection and served with a touch of butter, herbs, or spices for a warm and comforting meal.',
    recipeLink: 'https://www.loveandlemons.com/baked-sweet-potato/',
 
  },
  'Veggie Omelette':
  {
    title: 'Veggie Omelette',
    description:'A fluffy omelette packed with fresh vegetables, perfect for a healthy and filling start to the day.',
    recipeLink: 'https://www.allrecipes.com/recipe/14057/yummy-veggie-omelet/',
 
  },
  'Whole Grain Waffles':
  {
    title: 'Whole Grain Waffles',
    description:'Crispy on the outside, fluffy on the inside, these waffles are a wholesome twist on a breakfast classic.',
    recipeLink: 'https://totaste.com/recipe/chocolate-chip-waffles-with-oats-and-cinnamon/',
 
  },
  'Fruit Salad':
  {
    title: 'Fruit Salad',
    description:'A refreshing mix of seasonal fruits, bursting with natural sweetness and vitamins.',
    recipeLink: 'https://fortheloveofcooking.net/2013/05/fruit-salad-with-honey-citrus-dressing.html',
 
  },
  'Falafel Bowl':
  {
    title: 'Falafel Bowl',
    description:'A hearty bowl with crispy falafel, fresh veggies, and creamy dressing for a satisfying plant-based meal',
    recipeLink: 'https://tastythriftytimely.com/falafel-bowl/'
 
  },
  'Shrimp Tacos':
  {
    title: 'Shrimp Tacos',
    description:'Zesty shrimp wrapped in soft tortillas with fresh toppings for a light yet flavorful bite.”',
    recipeLink: 'https://www.pepperdelight.com/shrimp-tacos-with-avocado-yogurt-sauce/'
 
  },
  'Stuffed Bell Peppers':
  {
    title: 'Shrimp Tacos',
    description:'Zesty shrimp wrapped in soft tortillas with fresh toppings for a light yet flavorful bite.”',
    recipeLink: 'https://www.pepperdelight.com/shrimp-tacos-with-avocado-yogurt-sauce/'
 
  },
  'Chicken Fajitas':
  {
    title: 'Chicken Fajitas',
    description: 'Sizzling chicken strips tossed with peppers and onions, wrapped in warm tortillas for a Tex-Mex favorite.',
    recipeLink: 'https://www.simplyrecipes.com/recipes/chicken_fajitas/'
 
  },
  'Grilled Veggie Skewers':
  {
    title: 'Grilled Veggie Skewers',
    description: 'Colorful vegetables grilled to smoky perfection, served on skewers for a light and flavorful meal.',
    recipeLink: 'https://www.rebootwithjoe.com/recipe-of-the-week-herb-marinated-grilled-veggie-skewers/',
  },
  'Mushroom Risotto':
  {
    title: 'Mushroom Risotto',
    description:'Creamy Italian rice dish cooked slowly with mushrooms for a rich and comforting flavor.',
    recipeLink: 'https://www.allrecipes.com/recipe/85389/gourmet-mushroom-risotto/'
 
  }
 
};

export default imageMapping;
