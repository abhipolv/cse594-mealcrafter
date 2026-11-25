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
  "land_meat",
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
  land_meat: "Meat other than fish (pescatarian)",
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
  land_meat: [...PORK, ...BEEF, ...POULTRY, "lamb", "goat", "meat", "gelatin"],
  animal_products: [...PORK, ...BEEF, ...POULTRY, ...FISH, ...SHELLFISH, ...MILK, ...EGG, "lamb", "goat", "meat", "honey", "gelatin"],
};

/** Rules people often forget to report (Stage 1: halal only came up when asked about pork). */
export const OFTEN_FORGOTTEN: RuleTag[] = ["pork", "gelatin", "alcohol"];

/**
 * Setup choices on G03 and the rule tags each one adds. The filter enforces
 * the tags; `limits` is shown to the user so they know what is not checked.
 */
export const RULE_PRESETS = {
  halal: { label: "Halal", tags: ["pork", "gelatin", "alcohol"], limits: "I can't check whether meat is halal-certified." },
  kosher: { label: "Kosher", tags: ["pork", "shellfish"], limits: "I don't check meat and dairy in the same meal." },
  no_pork: { label: "No pork", tags: ["pork"] },
  no_beef: { label: "No beef", tags: ["beef"] },
  no_alcohol: { label: "No alcohol in cooking", tags: ["alcohol"] },
  no_gelatin: { label: "No gelatin", tags: ["gelatin"] },
  vegetarian: { label: "Vegetarian", tags: ["meat"] },
  vegan: { label: "Vegan", tags: ["animal_products"] },
  pescatarian: { label: "Pescatarian", tags: ["land_meat"] },
} as const satisfies Record<string, { label: string; tags: readonly RuleTag[]; limits?: string }>;

export type RulePreset = keyof typeof RULE_PRESETS;

/** Allergy chips on G02, in the Figma order. */
export const ALLERGY_TAGS = [
  "peanuts",
  "tree_nuts",
  "milk",
  "egg",
  "wheat_gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
] as const satisfies readonly RuleTag[];

/** Short chip labels for allergy tags. */
export const ALLERGY_LABELS: Record<(typeof ALLERGY_TAGS)[number], string> = {
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  milk: "Milk",
  egg: "Eggs",
  wheat_gluten: "Wheat",
  soy: "Soy",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
};
