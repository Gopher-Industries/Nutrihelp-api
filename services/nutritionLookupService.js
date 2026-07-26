const EXACT_LOOKUP = {
  apple_pie: { estimated_calories: 320, serving_description: '1 slice' },
  bibimbap: { estimated_calories: 560, serving_description: '1 bowl' },
  caesar_salad: { estimated_calories: 280, serving_description: '1 bowl' },
  cheesecake: { estimated_calories: 430, serving_description: '1 slice' },
  chicken_curry: { estimated_calories: 420, serving_description: '1 bowl' },
  chicken_wings: { estimated_calories: 430, serving_description: '6 wings' },
  chocolate_cake: { estimated_calories: 410, serving_description: '1 slice' },
  club_sandwich: { estimated_calories: 520, serving_description: '1 sandwich' },
  donuts: { estimated_calories: 260, serving_description: '1 donut' },
  falafel: { estimated_calories: 330, serving_description: '1 serving' },
  fish_and_chips: { estimated_calories: 680, serving_description: '1 plate' },
  french_fries: { estimated_calories: 365, serving_description: '1 medium serve' },
  fried_rice: { estimated_calories: 450, serving_description: '1 plate' },
  grilled_salmon: { estimated_calories: 360, serving_description: '1 fillet' },
  guacamole: { estimated_calories: 230, serving_description: '1 small bowl' },
  hamburger: { estimated_calories: 520, serving_description: '1 burger' },
  hot_dog: { estimated_calories: 330, serving_description: '1 hot dog' },
  hummus: { estimated_calories: 180, serving_description: '1 small bowl' },
  ice_cream: { estimated_calories: 275, serving_description: '1 cup' },
  lasagna: { estimated_calories: 430, serving_description: '1 slice' },
  macaroni_and_cheese: { estimated_calories: 460, serving_description: '1 bowl' },
  nachos: { estimated_calories: 520, serving_description: '1 plate' },
  omelette: { estimated_calories: 250, serving_description: '1 omelette' },
  pad_thai: { estimated_calories: 540, serving_description: '1 plate' },
  pancakes: { estimated_calories: 350, serving_description: '3 pancakes' },
  pho: { estimated_calories: 380, serving_description: '1 bowl' },
  pizza: { estimated_calories: 285, serving_description: '1 slice' },
  ramen: { estimated_calories: 490, serving_description: '1 bowl' },
  risotto: { estimated_calories: 420, serving_description: '1 bowl' },
  sashimi: { estimated_calories: 220, serving_description: '1 serving' },
  spaghetti_bolognese: { estimated_calories: 520, serving_description: '1 plate' },
  spaghetti_carbonara: { estimated_calories: 610, serving_description: '1 plate' },
  steak: { estimated_calories: 620, serving_description: '1 steak' },
  sushi: { estimated_calories: 320, serving_description: '1 roll set' },
  tacos: { estimated_calories: 300, serving_description: '2 tacos' },
  tiramisu: { estimated_calories: 390, serving_description: '1 slice' },
  waffles: { estimated_calories: 370, serving_description: '2 waffles' },
  avocado_toast: { estimated_calories: 310, serving_description: '1 slice' },
  greek_salad: { estimated_calories: 240, serving_description: '1 bowl' },
  quinoa_salad: { estimated_calories: 320, serving_description: '1 bowl' },
  chickpea_salad: { estimated_calories: 340, serving_description: '1 bowl' },
  tofu_stir_fry: { estimated_calories: 410, serving_description: '1 bowl' },
  burrito_bowl: { estimated_calories: 540, serving_description: '1 bowl' },
  overnight_oats: { estimated_calories: 300, serving_description: '1 jar' },
  protein_smoothie: { estimated_calories: 260, serving_description: '1 glass' },
  grilled_chicken_bowl: { estimated_calories: 460, serving_description: '1 bowl' },
  lentil_soup: { estimated_calories: 280, serving_description: '1 bowl' },
  salmon_bowl: { estimated_calories: 520, serving_description: '1 bowl' },
  veggie_wrap: { estimated_calories: 360, serving_description: '1 wrap' },
  bean_chili: { estimated_calories: 390, serving_description: '1 bowl' },
  cottage_cheese_bowl: { estimated_calories: 220, serving_description: '1 bowl' },
  chana_masala: { estimated_calories: 430, serving_description: '1 bowl' },
  kimchi_bibimbap: { estimated_calories: 570, serving_description: '1 bowl' },
  thai_basil_chicken: { estimated_calories: 520, serving_description: '1 plate' },
  turkish_lentil_soup: { estimated_calories: 290, serving_description: '1 bowl' },
  falafel_wrap: { estimated_calories: 480, serving_description: '1 wrap' },
  shakshuka: { estimated_calories: 360, serving_description: '1 skillet serve' },
  mojo_fish: { estimated_calories: 510, serving_description: '1 plate' },
  black_bean_rice: { estimated_calories: 520, serving_description: '1 bowl' },
  onigiri: { estimated_calories: 190, serving_description: '2 pieces' },
  dal_khichdi: { estimated_calories: 500, serving_description: '1 bowl' },
};

const KEYWORD_FALLBACKS = [
  ['salad', { estimated_calories: 220, serving_description: '1 bowl' }],
  ['soup',  { estimated_calories: 180, serving_description: '1 bowl' }],
  ['cake',  { estimated_calories: 410, serving_description: '1 slice' }],
  ['sandwich', { estimated_calories: 480, serving_description: '1 sandwich' }],
];

const LABEL_ALIASES = {
  'apple pie': 'apple_pie', 'caesar salad': 'caesar_salad', 'chicken curry': 'chicken_curry',
  'chicken wings': 'chicken_wings', 'chocolate cake': 'chocolate_cake', 'club sandwich': 'club_sandwich',
  'fish and chips': 'fish_and_chips', 'french fries': 'french_fries', 'fried rice': 'fried_rice',
  'grilled salmon': 'grilled_salmon', 'hot dog': 'hot_dog', 'ice cream': 'ice_cream',
  'macaroni and cheese': 'macaroni_and_cheese', 'pad thai': 'pad_thai',
  'spaghetti bolognese': 'spaghetti_bolognese', 'spaghetti carbonara': 'spaghetti_carbonara',
  'avocado toast': 'avocado_toast', 'greek salad': 'greek_salad', 'quinoa salad': 'quinoa_salad',
  'tofu stir fry': 'tofu_stir_fry', 'overnight oats': 'overnight_oats',
  'protein smoothie': 'protein_smoothie', 'burrito bowl': 'burrito_bowl', 'bean chili': 'bean_chili',
  'chana masala': 'chana_masala', 'kimchi bibimbap': 'kimchi_bibimbap',
  'thai basil chicken': 'thai_basil_chicken', 'turkish lentil soup': 'turkish_lentil_soup',
  'falafel wrap': 'falafel_wrap', 'black bean rice': 'black_bean_rice',
  'mojo fish': 'mojo_fish', 'dal khichdi': 'dal_khichdi',
};

function normalizeLabel(label) {
  if (!label) return '';
  let text = String(label).trim().toLowerCase();
  text = LABEL_ALIASES[text] || text;
  text = text.replace(/[^a-z0-9\s_-]+/g, '').replace(/[\s-]+/g, '_');
  return LABEL_ALIASES[text] || text;
}

function humanizeLabel(label) {
  if (!label) return 'Unknown Dish';
  return label.replace(/_/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function unavailable(label) {
  const normalized = normalizeLabel(label);
  return {
    display_name: humanizeLabel(normalized || label),
    about: null, cuisine: null,
    estimated_calories: null, serving_description: null,
    protein_g: null, carbs_g: null, fat_g: null, fibre_g: null,
    sugar_g: null, sodium_mg: null,
    micronutrients: {}, vitamins: [], minerals: [], allergens: [], food_categories: [],
    source: 'unavailable', available: false,
  };
}

function lookup(label) {
  if (!label) return unavailable(null);
  const normalized = normalizeLabel(label);
  const displayName = humanizeLabel(normalized || label);

  if (EXACT_LOOKUP[normalized]) {
    const data = EXACT_LOOKUP[normalized];
    return {
      display_name: displayName,
      about: null, cuisine: null,
      estimated_calories: data.estimated_calories,
      serving_description: data.serving_description,
      protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0,
      sugar_g: 0, sodium_mg: 0,
      micronutrients: {}, vitamins: [], minerals: [], allergens: [], food_categories: [],
      source: 'curated_lookup', available: true,
    };
  }

  for (const [keyword, data] of KEYWORD_FALLBACKS) {
    if (normalized.includes(keyword)) {
      return {
        display_name: displayName,
        about: null, cuisine: null,
        estimated_calories: data.estimated_calories,
        serving_description: data.serving_description,
        protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0,
        sugar_g: 0, sodium_mg: 0,
        micronutrients: {}, vitamins: [], minerals: [], allergens: [], food_categories: [],
        source: 'category_heuristic', available: true,
      };
    }
  }

  return unavailable(label);
}

module.exports = { lookup };
