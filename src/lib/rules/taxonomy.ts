// Fixed vocabulary of food rules. The rule filter (filter.ts) matches meal
// ingredients against these keywords in plain code, so a model mistake cannot
// put a forbidden ingredient in front of the user (requirement N1).
//
// Keywords are matched as whole words, case-insensitively, against ingredient
// names. When in doubt, add a keyword: a false alarm hides one meal, a miss
// can hurt someone.

export const RULE_TAGS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "egg",
  "wheat_gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
  "pork",
  "gelatin",
  "alcohol",
  "beef",
  "meat",
  "animal_products",
] as const;

export type RuleTag = (typeof RULE_TAGS)[number];

export const RULE_LABELS: Record<RuleTag, string> = {
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  milk: "Milk",
  egg: "Eggs",
  wheat_gluten: "Wheat or gluten",
  soy: "Soy",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
  pork: "Pork",
  gelatin: "Gelatin",
  alcohol: "Alcohol in cooking",
  beef: "Beef",
  meat: "Meat (vegetarian)",
  animal_products: "Animal products (vegan)",
};

const PORK = ["pork", "bacon", "ham", "prosciutto", "pancetta", "chorizo", "salami", "pepperoni", "lard", "sausage", "hot dog"];
const BEEF = ["beef", "steak", "brisket", "veal", "ground beef", "burger patty", "pastrami", "corned beef"];
const POULTRY = ["chicken", "turkey", "duck", "goose"];
const FISH = ["fish", "salmon", "tuna", "cod", "tilapia", "trout", "sardine", "sardines", "anchovy", "anchovies", "mackerel", "halibut", "fish sauce"];
const SHELLFISH = ["shrimp", "prawn", "prawns", "crab", "lobster", "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "crawfish", "oyster sauce"];
const MILK = ["milk", "cheese", "cheddar", "mozzarella", "parmesan", "feta", "ricotta", "mascarpone", "butter", "cream", "sour cream", "yogurt", "yoghurt", "kefir", "ghee", "whey", "casein", "ice cream", "paneer", "labneh", "cream cheese"];
const EGG = ["egg", "eggs", "mayonnaise", "mayo", "meringue", "aioli"];

export const RULE_KEYWORDS: Record<RuleTag, string[]> = {
  peanuts: ["peanut", "peanuts", "peanut butter", "groundnut", "satay"],
  tree_nuts: [
    "almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "pecans",
    "pistachio", "pistachios", "hazelnut", "hazelnuts", "macadamia", "brazil nut",
    "pine nut", "pine nuts", "pesto", "praline", "marzipan", "nutella", "almond milk",
    "nut", "nuts", "granola",
  ],
  milk: MILK,
  egg: EGG,
  wheat_gluten: ["wheat", "flour", "bread", "pasta", "spaghetti", "noodles", "tortilla", "tortillas", "couscous", "barley", "rye", "seitan", "soy sauce", "breadcrumbs", "panko", "cracker", "crackers"],
  soy: ["soy", "soy sauce", "tofu", "tempeh", "edamame", "miso", "soybean", "soybeans"],
  fish: FISH,
  shellfish: SHELLFISH,
  sesame: ["sesame", "tahini", "sesame oil", "hummus"],
  pork: PORK,
  gelatin: ["gelatin", "gelatine", "marshmallow", "marshmallows", "gummy", "jello", "jell-o"],
  alcohol: ["wine", "beer", "rum", "vodka", "sake", "mirin", "brandy", "sherry", "bourbon", "whiskey", "liqueur", "vanilla extract"],
  beef: BEEF,
  meat: [...PORK, ...BEEF, ...POULTRY, ...FISH, ...SHELLFISH, "lamb", "goat", "meat", "gelatin", "anchovy paste"],
  animal_products: [...PORK, ...BEEF, ...POULTRY, ...FISH, ...SHELLFISH, ...MILK, ...EGG, "lamb", "goat", "meat", "honey", "gelatin"],
};

/** Rules people often forget to report (Stage 1: halal only came up when asked about pork). */
export const OFTEN_FORGOTTEN: RuleTag[] = ["pork", "gelatin", "alcohol"];
