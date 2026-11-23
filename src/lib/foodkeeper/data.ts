// Storage times from the USDA FSIS FoodKeeper dataset (data version 128,
// fsis.usda.gov/shared/data/EN/foodkeeper.json, public domain). The numbers
// were copied by script from that dataset; every entry keeps its FoodKeeper
// product id so it can be traced. `label`, `match`, `states` and `plain` are
// ours: how an item name finds an entry, and whether the name alone settles
// what the food contains (single-ingredient foods).
//
// Times count from purchase or preparation. "package" means FoodKeeper says to
// follow the date on the package.

export type Span = { min: number; max: number; unit: "days" | "weeks" | "months" | "years" } | { note: "package" };

export type Guideline = {
  id: number;
  label: string;
  match: string[];
  /** Only for items in these states (e.g. cooked rice vs dry rice). */
  states?: ("raw" | "cooked" | "leftover" | "frozen" | "pantry")[];
  fridge?: Span;
  fridgeOpened?: Span;
  pantry?: Span;
  pantryOpened?: Span;
  freezer?: Span;
  plain?: boolean;
};

export const GUIDELINES: Guideline[] = [
  { id: 1, label: "Butter", match: ["butter"], fridge: { min: 1, max: 2, unit: "months" }, freezer: { min: 6, max: 9, unit: "months" }, plain: true },
  { id: 3, label: "Hard cheese", match: ["cheddar", "swiss", "parmesan", "hard cheese", "block cheese"], fridge: { min: 6, max: 6, unit: "months" }, fridgeOpened: { min: 3, max: 4, unit: "weeks" }, freezer: { min: 6, max: 6, unit: "months" }, plain: true },
  { id: 5, label: "Shredded cheese", match: ["shredded cheese", "shredded cheddar", "shredded mozzarella", "shredded"], fridge: { min: 1, max: 1, unit: "months" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 7, label: "Soft cheese", match: ["brie", "goat cheese"], fridge: { min: 1, max: 2, unit: "weeks" }, freezer: { min: 6, max: 6, unit: "months" } },
  { id: 9, label: "Cottage cheese", match: ["cottage cheese"], fridge: { min: 2, max: 2, unit: "weeks" }, fridgeOpened: { min: 1, max: 1, unit: "weeks" }, plain: true },
  { id: 10, label: "Cream cheese", match: ["cream cheese"], fridge: { min: 2, max: 2, unit: "weeks" }, plain: true },
  { id: 13, label: "Half and half", match: ["half and half"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 4, max: 4, unit: "months" }, plain: true },
  { id: 14, label: "Heavy cream", match: ["heavy cream", "whipping cream"], fridge: { min: 10, max: 10, unit: "days" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 21, label: "Eggs", match: ["egg", "eggs"], states: ["raw"], fridge: { min: 3, max: 5, unit: "weeks" }, plain: true },
  { id: 23, label: "Hard-boiled eggs", match: ["hard boiled", "boiled eggs", "boiled egg"], fridge: { min: 1, max: 1, unit: "weeks" } },
  { id: 24, label: "Egg dishes", match: ["omelet", "quiche", "scrambled eggs", "frittata"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 2, max: 3, unit: "months" } },
  { id: 25, label: "Kefir", match: ["kefir"], fridge: { min: 1, max: 1, unit: "weeks" }, fridgeOpened: { min: 1, max: 2, unit: "days" } },
  { id: 27, label: "Milk", match: ["milk", "whole milk", "skim milk"], fridge: { note: "package" }, freezer: { min: 3, max: 3, unit: "months" }, plain: true },
  { id: 29, label: "Sour cream", match: ["sour cream"], fridge: { note: "package" }, plain: true },
  { id: 33, label: "Yogurt", match: ["yogurt", "yoghurt"], fridge: { min: 1, max: 2, unit: "weeks" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 248, label: "Apples", match: ["apple", "apples"], fridge: { min: 4, max: 6, unit: "weeks" }, pantry: { min: 3, max: 3, unit: "weeks" }, freezer: { min: 8, max: 8, unit: "months" }, plain: true },
  { id: 250, label: "Avocados", match: ["avocado", "avocados"], fridge: { min: 3, max: 4, unit: "days" }, plain: true },
  { id: 251, label: "Bananas", match: ["banana", "bananas"], fridge: { min: 3, max: 3, unit: "days" }, freezer: { min: 2, max: 3, unit: "months" }, plain: true },
  { id: 254, label: "Blueberries", match: ["blueberries", "blueberry"], fridge: { min: 1, max: 2, unit: "weeks" }, freezer: { min: 8, max: 12, unit: "months" }, plain: true },
  { id: 256, label: "Citrus fruit", match: ["lemon", "lemons", "lime", "limes", "orange", "oranges", "grapefruit", "clementine", "clementines", "mandarin", "mandarins"], fridge: { min: 10, max: 21, unit: "days" }, pantry: { min: 10, max: 10, unit: "days" }, plain: true },
  { id: 261, label: "Grapes", match: ["grape", "grapes"], fridge: { min: 1, max: 1, unit: "weeks" }, pantry: { min: 1, max: 1, unit: "days" }, freezer: { min: 1, max: 1, unit: "months" }, plain: true },
  { id: 264, label: "Melons", match: ["melon", "cantaloupe", "honeydew"], fridge: { min: 2, max: 2, unit: "weeks" }, fridgeOpened: { min: 2, max: 4, unit: "days" }, freezer: { min: 1, max: 1, unit: "months" }, plain: true },
  { id: 266, label: "Peaches, pears and plums", match: ["peach", "peaches", "pear", "pears", "plum", "plums", "nectarine", "nectarines"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 2, max: 2, unit: "months" }, plain: true },
  { id: 273, label: "Green beans and peas", match: ["green beans", "snap peas", "snow peas", "peas"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 8, max: 8, unit: "months" }, plain: true },
  { id: 276, label: "Broccoli", match: ["broccoli"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 278, label: "Cabbage", match: ["cabbage"], fridge: { min: 1, max: 2, unit: "weeks" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 279, label: "Carrots", match: ["carrot", "carrots", "baby carrots"], fridge: { min: 2, max: 3, unit: "weeks" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 280, label: "Cauliflower", match: ["cauliflower"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 281, label: "Celery", match: ["celery"], fridge: { min: 1, max: 2, unit: "weeks" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 283, label: "Cucumbers", match: ["cucumber", "cucumbers"], fridge: { min: 4, max: 6, unit: "days" }, plain: true },
  { id: 288, label: "Fresh herbs", match: ["herbs", "fresh herbs", "dill", "mint", "rosemary", "thyme"], fridge: { min: 7, max: 10, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" }, plain: true },
  { id: 290, label: "Lettuce", match: ["lettuce", "romaine", "iceberg"], fridge: { min: 1, max: 2, unit: "weeks" }, plain: true },
  { id: 291, label: "Spinach and leaf lettuce", match: ["spinach", "leaf lettuce", "salad greens", "mixed greens", "arugula"], fridge: { min: 3, max: 7, unit: "days" }, plain: true },
  { id: 292, label: "Mushrooms", match: ["mushroom", "mushrooms"], fridge: { min: 3, max: 7, unit: "days" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 294, label: "Onions", match: ["onion", "onions"], fridge: { min: 2, max: 2, unit: "months" }, pantry: { min: 1, max: 1, unit: "months" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 295, label: "Green onions", match: ["green onion", "green onions", "scallion", "scallions", "spring onions"], fridge: { min: 1, max: 1, unit: "weeks" }, pantry: { min: 1, max: 1, unit: "months" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 296, label: "Peppers", match: ["pepper", "peppers", "bell pepper", "bell peppers", "jalapeno", "jalapenos"], fridge: { min: 4, max: 14, unit: "days" }, freezer: { min: 6, max: 8, unit: "months" }, plain: true },
  { id: 297, label: "Potatoes", match: ["potato", "potatoes"], fridge: { min: 1, max: 2, unit: "weeks" }, pantry: { min: 1, max: 2, unit: "months" }, freezer: { min: 10, max: 12, unit: "months" }, plain: true },
  { id: 306, label: "Tomatoes", match: ["tomato", "tomatoes", "cherry tomatoes"], freezer: { min: 2, max: 2, unit: "months" }, plain: true },
  { id: 423, label: "Kale", match: ["kale"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 8, max: 12, unit: "months" }, plain: true },
  { id: 481, label: "Strawberries", match: ["strawberry", "strawberries"], fridge: { min: 2, max: 3, unit: "days" }, freezer: { min: 8, max: 12, unit: "months" }, plain: true },
  { id: 506, label: "Cilantro", match: ["cilantro"], fridge: { min: 2, max: 3, unit: "weeks" }, pantry: { min: 1, max: 2, unit: "weeks" }, plain: true },
  { id: 509, label: "Fresh basil", match: ["basil", "fresh basil"], fridge: { min: 10, max: 10, unit: "days" }, pantry: { min: 5, max: 5, unit: "days" }, plain: true },
  { id: 547, label: "Zucchini", match: ["zucchini"], fridge: { min: 1, max: 1, unit: "weeks" }, freezer: { min: 10, max: 10, unit: "months" }, plain: true },
  { id: 611, label: "Parsley", match: ["parsley"], fridge: { min: 2, max: 3, unit: "days" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 40, label: "Beef steaks", match: ["steak", "steaks"], states: ["raw", "frozen"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 4, max: 12, unit: "months" }, plain: true },
  { id: 43, label: "Ground beef", match: ["ground beef", "beef mince"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 64, label: "Pork chops", match: ["pork chop", "pork chops"], states: ["raw", "frozen"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 4, max: 12, unit: "months" }, plain: true },
  { id: 73, label: "Ground pork", match: ["ground pork"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 79, label: "Bacon", match: ["bacon"], states: ["raw", "frozen"], fridge: { min: 1, max: 1, unit: "weeks" }, fridgeOpened: { min: 1, max: 1, unit: "weeks" }, freezer: { min: 1, max: 1, unit: "months" } },
  { id: 98, label: "Hot dogs", match: ["hot dog", "hot dogs"], fridge: { min: 2, max: 2, unit: "weeks" }, fridgeOpened: { min: 1, max: 1, unit: "weeks" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 102, label: "Raw sausage", match: ["sausage", "sausages", "bratwurst"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 103, label: "Cooked sausage", match: ["kielbasa", "smoked sausage", "cooked sausage"], fridge: { min: 1, max: 1, unit: "weeks" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 113, label: "Whole chicken", match: ["whole chicken"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 12, max: 12, unit: "months" }, plain: true },
  { id: 115, label: "Ground chicken or turkey", match: ["ground chicken", "ground turkey"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 3, max: 4, unit: "months" }, plain: true },
  { id: 117, label: "Chicken breasts", match: ["chicken breast", "chicken breasts"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 9, max: 9, unit: "months" }, plain: true },
  { id: 118, label: "Chicken thighs or legs", match: ["chicken thighs", "chicken thigh", "chicken legs", "drumsticks", "chicken"], states: ["raw", "frozen"], fridge: { min: 1, max: 2, unit: "days" }, freezer: { min: 9, max: 9, unit: "months" }, plain: true },
  { id: 135, label: "Cooked chicken dishes", match: ["chicken", "turkey", "rotisserie chicken"], states: ["cooked", "leftover"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 4, max: 6, unit: "months" } },
  { id: 184, label: "Deli meat, sliced at the store", match: ["deli turkey", "deli ham", "sliced turkey", "sliced ham", "lunch meat", "deli meat"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 148, label: "Cooked fish", match: ["fish", "salmon", "tuna", "cod", "tilapia"], states: ["cooked", "leftover"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 151, label: "Shrimp", match: ["shrimp", "prawns"], states: ["raw", "frozen"], fridge: { min: 1, max: 3, unit: "days" }, freezer: { min: 6, max: 18, unit: "months" }, plain: true },
  { id: 173, label: "Leftovers", match: ["leftovers", "leftover"], states: ["cooked", "leftover"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 2, max: 3, unit: "months" } },
  { id: 175, label: "Leftover pizza", match: ["pizza"], states: ["cooked", "leftover"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 177, label: "Cooked pasta", match: ["pasta", "spaghetti", "noodles", "macaroni"], states: ["cooked", "leftover"], fridge: { min: 3, max: 5, unit: "days" }, freezer: { min: 1, max: 2, unit: "months" } },
  { id: 178, label: "Cooked rice", match: ["rice", "fried rice"], states: ["cooked", "leftover"], fridge: { min: 4, max: 6, unit: "days" }, freezer: { min: 6, max: 6, unit: "months" } },
  { id: 181, label: "Hummus", match: ["hummus"], fridge: { min: 3, max: 3, unit: "months" }, fridgeOpened: { min: 7, max: 7, unit: "days" } },
  { id: 193, label: "Soup or stew", match: ["soup", "stew", "chili", "curry"], states: ["cooked", "leftover"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 2, max: 3, unit: "months" } },
  { id: 190, label: "Egg salad", match: ["egg salad"], fridge: { min: 3, max: 4, unit: "days" } },
  { id: 420, label: "Pasta salad", match: ["pasta salad"], fridge: { min: 3, max: 5, unit: "days" } },
  { id: 347, label: "Jam and jelly", match: ["jam", "jelly", "preserves", "strawberry spread", "fruit spread"], fridgeOpened: { min: 6, max: 12, unit: "months" }, pantry: { min: 6, max: 18, unit: "months" } },
  { id: 348, label: "Ketchup", match: ["ketchup", "chili sauce"], fridgeOpened: { min: 6, max: 6, unit: "months" }, pantry: { min: 1, max: 1, unit: "years" } },
  { id: 350, label: "Mayonnaise", match: ["mayonnaise", "mayo"], fridgeOpened: { min: 2, max: 2, unit: "months" }, pantry: { min: 3, max: 6, unit: "months" } },
  { id: 351, label: "Mustard", match: ["mustard"], fridgeOpened: { min: 1, max: 1, unit: "years" }, pantry: { min: 1, max: 2, unit: "years" } },
  { id: 354, label: "Pesto", match: ["pesto"], fridge: { min: 6, max: 6, unit: "months" }, fridgeOpened: { min: 3, max: 3, unit: "days" }, freezer: { min: 1, max: 1, unit: "months" } },
  { id: 356, label: "Salad dressing", match: ["salad dressing", "dressing", "ranch", "vinaigrette"], fridgeOpened: { min: 1, max: 3, unit: "months" }, pantry: { min: 10, max: 12, unit: "months" } },
  { id: 357, label: "Salsa", match: ["salsa"], fridgeOpened: { min: 1, max: 1, unit: "months" }, pantry: { min: 1, max: 1, unit: "years" } },
  { id: 360, label: "Soy sauce", match: ["soy sauce", "teriyaki sauce", "teriyaki"], fridgeOpened: { min: 1, max: 1, unit: "months" }, pantry: { min: 3, max: 3, unit: "years" } },
  { id: 387, label: "Peanut butter", match: ["peanut butter"], pantry: { min: 6, max: 24, unit: "months" }, pantryOpened: { min: 2, max: 3, unit: "months" } },
  { id: 559, label: "Hot sauce", match: ["hot sauce", "sriracha"], pantry: { min: 6, max: 6, unit: "months" } },
  { id: 599, label: "Tomato sauce", match: ["tomato sauce", "pasta sauce", "marinara", "pizza sauce"], fridgeOpened: { min: 3, max: 5, unit: "days" }, pantry: { note: "package" } },
  { id: 168, label: "Tofu", match: ["tofu"], fridge: { min: 1, max: 1, unit: "weeks" }, freezer: { min: 5, max: 5, unit: "months" }, plain: true },
  { id: 328, label: "Tempeh", match: ["tempeh"], fridge: { min: 3, max: 4, unit: "days" }, freezer: { min: 6, max: 6, unit: "months" } },
  { id: 196, label: "Flour tortillas", match: ["flour tortillas", "tortillas", "tortilla", "wraps"], fridgeOpened: { min: 3, max: 3, unit: "months" }, pantry: { min: 3, max: 3, unit: "months" }, freezer: { min: 6, max: 6, unit: "months" } },
  { id: 553, label: "Corn tortillas", match: ["corn tortillas", "corn tortilla"], fridge: { min: 60, max: 90, unit: "days" }, pantry: { min: 25, max: 45, unit: "days" } },
  { id: 195, label: "Bread", match: ["bread", "bagel", "bagels", "buns", "rolls", "english muffins"], fridgeOpened: { min: 2, max: 3, unit: "weeks" }, pantry: { min: 14, max: 18, unit: "days" }, freezer: { min: 3, max: 5, unit: "months" } },
  { id: 335, label: "Dry pasta", match: ["pasta", "spaghetti", "penne", "macaroni", "noodles"], states: ["pantry", "raw"], pantry: { min: 2, max: 2, unit: "years" }, pantryOpened: { min: 1, max: 1, unit: "years" }, plain: true },
  { id: 338, label: "Rice", match: ["rice", "white rice", "brown rice", "jasmine rice"], states: ["pantry", "raw"], fridgeOpened: { min: 6, max: 6, unit: "months" }, pantry: { min: 2, max: 2, unit: "years" }, pantryOpened: { min: 1, max: 1, unit: "years" }, plain: true },
  { id: 555, label: "Granola", match: ["granola"], pantry: { min: 6, max: 9, unit: "months" } },
  { id: 455, label: "Orange juice", match: ["orange juice", "oj"], fridgeOpened: { min: 7, max: 10, unit: "days" }, freezer: { min: 8, max: 12, unit: "months" } },
  { id: 421, label: "Soy milk", match: ["soy milk"], fridge: { note: "package" }, fridgeOpened: { min: 7, max: 10, unit: "days" } },
  { id: 427, label: "Almond milk", match: ["almond milk"], fridge: { note: "package" }, fridgeOpened: { min: 7, max: 10, unit: "days" } },
  { id: 408, label: "Oat or rice milk", match: ["oat milk", "rice milk"], fridgeOpened: { min: 7, max: 10, unit: "days" } },
];
