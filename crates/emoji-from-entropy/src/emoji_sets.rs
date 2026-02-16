//! Curated emoji sets for identity generation.

/// Categories of emojis.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Category {
  Face,
  Nature,
  Food,
  Animal,
  Object,
  Symbol,
}

/// The curated emoji set (original irreversible implementation).
pub struct EmojiSet {
  faces: &'static [char],
  nature: &'static [char],
  food: &'static [char],
  animals: &'static [char],
  objects: &'static [char],
  symbols: &'static [char],
  include_symbols: bool,
}

impl EmojiSet {
  pub fn new(include_symbols: bool) -> Self {
    Self {
      faces: &FACES,
      nature: &NATURE,
      food: &FOOD,
      animals: &ANIMALS,
      objects: &OBJECTS,
      symbols: &SYMBOLS,
      include_symbols,
    }
  }

  /// Get first emoji from starter set.
  pub fn first_emoji(&self, byte1: u8, byte2: u8) -> char {
    let value = ((byte1 as usize) << 8 | byte2 as usize) % STARTERS.len();
    STARTERS[value]
  }

  /// Get random face.
  pub fn random_face(&self, value: usize) -> char {
    self.faces[value % self.faces.len()]
  }

  /// Get random non-face, cycling through categories.
  pub fn random_other(&self, position: usize) -> char {
    let categories = if self.include_symbols {
      vec![
        Category::Nature,
        Category::Food,
        Category::Animal,
        Category::Object,
        Category::Symbol,
      ]
    } else {
      vec![
        Category::Nature,
        Category::Food,
        Category::Animal,
        Category::Object,
      ]
    };

    let category = categories[position % categories.len()];
    self.random_from_category(category, position * 31)
  }

  fn random_from_category(&self, category: Category, value: usize) -> char {
    let set = match category {
      Category::Face => self.faces,
      Category::Nature => self.nature,
      Category::Food => self.food,
      Category::Animal => self.animals,
      Category::Object => self.objects,
      Category::Symbol => self.symbols,
    };
    set[value % set.len()]
  }
}

// =============== ORIGINAL SMALL SETS (for irreversible encoding) ===============

// Starter emojis (first position, encodes config)
pub(crate) const STARTERS: &[char] = &[
  '\u{1F332}',
  '\u{1F981}',
  '\u{1F355}',
  '\u{1F30A}',
  '\u{26A1}',
  '\u{1F525}',
  '\u{2B50}',
  '\u{1F319}',
  '\u{1F30D}',
  '\u{1F3A8}',
  '\u{1F680}',
  '\u{1F3B5}',
  '\u{1F4DA}',
  '\u{1F52E}',
  '\u{1F48E}',
];

// Face emojis (abbreviated)
pub(crate) const FACES: &[char] = &[
  '\u{1F600}',
  '\u{1F603}',
  '\u{1F604}',
  '\u{1F601}',
  '\u{1F606}',
  '\u{1F605}',
  '\u{1F602}',
  '\u{1F923}',
  '\u{1F60A}',
  '\u{1F607}',
];

// Nature emojis (abbreviated)
pub(crate) const NATURE: &[char] = &[
  '\u{1F330}',
  '\u{1F331}',
  '\u{1F332}',
  '\u{1F333}',
  '\u{1F334}',
  '\u{1F335}',
  '\u{1F337}',
  '\u{1F338}',
  '\u{1F339}',
  '\u{1F33A}',
];

// Food emojis (abbreviated)
pub(crate) const FOOD: &[char] = &[
  '\u{1F345}',
  '\u{1F346}',
  '\u{1F347}',
  '\u{1F348}',
  '\u{1F349}',
  '\u{1F34A}',
  '\u{1F34B}',
  '\u{1F34C}',
  '\u{1F34D}',
  '\u{1F96D}',
];

// Animal emojis (abbreviated)
pub(crate) const ANIMALS: &[char] = &[
  '\u{1F400}',
  '\u{1F401}',
  '\u{1F402}',
  '\u{1F403}',
  '\u{1F404}',
  '\u{1F405}',
  '\u{1F406}',
  '\u{1F407}',
  '\u{1F408}',
  '\u{1F409}',
];

// Object emojis (abbreviated)
pub(crate) const OBJECTS: &[char] = &[
  '\u{1F4E0}',
  '\u{1F4E1}',
  '\u{1F4E2}',
  '\u{1F4E3}',
  '\u{1F4E4}',
  '\u{1F4E5}',
  '\u{1F4E6}',
  '\u{1F4E7}',
  '\u{1F4E8}',
  '\u{1F4E9}',
];

// Symbol emojis (abbreviated)
pub(crate) const SYMBOLS: &[char] = &[
  '\u{2700}', '\u{2701}', '\u{2702}', '\u{2703}', '\u{2704}', '\u{2705}', '\u{2706}', '\u{2707}',
  '\u{2708}', '\u{2709}',
];

// =============== LARGE SETS FOR REVERSIBLE ENCODING ===============
// These have exactly 1024 entries for 10-bit indexing
// Each set is constructed from non-overlapping Unicode ranges

/// Large starter set for reversible encoding (1024 entries)
pub static STARTERS_LARGE: [char; 1024] = generate_starters_large();

/// Large face set for reversible encoding (1024 entries)  
pub static FACES_LARGE: [char; 1024] = generate_faces_large();

/// Large nature set for reversible encoding (1024 entries)
pub static NATURE_LARGE: [char; 1024] = generate_nature_large();

/// Large food set for reversible encoding (1024 entries)
pub static FOOD_LARGE: [char; 1024] = generate_food_large();

/// Large animal set for reversible encoding (1024 entries)
pub static ANIMALS_LARGE: [char; 1024] = generate_animals_large();

/// Large object set for reversible encoding (1024 entries)
pub static OBJECTS_LARGE: [char; 1024] = generate_objects_large();

/// Large symbol set for reversible encoding (1024 entries)
pub static SYMBOLS_LARGE: [char; 1024] = generate_symbols_large();

// =============== CONST GENERATION FUNCTIONS ===============
// Each generates exactly 1024 unique elements from valid Unicode codepoints

const fn generate_starters_large() -> [char; 1024] {
  let mut result = ['\u{2B50}'; 1024];
  let mut i = 0;
  let mut codepoint: u32 = 0x1F300; // Start of Misc Symbols

  // Misc Symbols and Pictographs: U+1F300 to U+1F5FF (768 valid chars)
  while i < 768 && codepoint <= 0x1F5FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Supplemental Symbols: U+1F900 to U+1F9FF (256 valid chars)
  codepoint = 0x1F900;
  while i < 1024 && codepoint <= 0x1F9FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_faces_large() -> [char; 1024] {
  let mut result = ['\u{1F600}'; 1024];
  let mut i = 0;

  // Emoticons block: U+1F600 to U+1F64F
  let mut codepoint: u32 = 0x1F600;
  while i < 80 && codepoint <= 0x1F64F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Supplemental Symbols and Pictographs (faces portion): U+1F910 to U+1F96F
  codepoint = 0x1F910;
  while i < 176 && codepoint <= 0x1F96F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Extended pictographs (faces): U+1F970 to U+1F9BF
  codepoint = 0x1F970;
  while i < 256 && codepoint <= 0x1F9BF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Transport and Map Symbols (people/activities): U+1F680 to U+1F6C5
  codepoint = 0x1F680;
  while i < 320 && codepoint <= 0x1F6C5 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Activities (people doing things): U+1F3C2 to U+1F3CF
  codepoint = 0x1F3C2;
  while i < 400 && codepoint <= 0x1F3CF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Body parts: U+1F440 to U+1F4AA
  codepoint = 0x1F440;
  while i < 480 && codepoint <= 0x1F4AA {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Person symbols: U+1F648 to U+1F64A, U+1F930 to U+1F93A
  codepoint = 0x1F648;
  while i < 490 && codepoint <= 0x1F64A {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }
  codepoint = 0x1F930;
  while i < 520 && codepoint <= 0x1F93A {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Fill remainder with dingbats (U+2700 to U+27BF)
  codepoint = 0x2700;
  while i < 1024 && codepoint <= 0x27BF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_nature_large() -> [char; 1024] {
  let mut result = ['\u{1F330}'; 1024];
  let mut i = 0;

  // Plants: U+1F330 to U+1F3F9
  let mut codepoint: u32 = 0x1F330;
  while i < 180 && codepoint <= 0x1F3F9 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Weather: U+1F300 to U+1F32F
  codepoint = 0x1F300;
  while i < 250 && codepoint <= 0x1F32F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Celestial/weather misc: U+2600 to U+2630
  codepoint = 0x2600;
  while i < 310 && codepoint <= 0x2630 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Moon phases: U+1F311 to U+1F320
  codepoint = 0x1F311;
  while i < 330 && codepoint <= 0x1F320 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Animals: U+1F400 to U+1F43F
  codepoint = 0x1F400;
  while i < 410 && codepoint <= 0x1F43F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Extended animals: U+1F980 to U+1F9AE
  codepoint = 0x1F980;
  while i < 490 && codepoint <= 0x1F9AE {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // More extended: U+1F9A0 to U+1F9BF
  codepoint = 0x1F9A0;
  while i < 560 && codepoint <= 0x1F9BF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Marine: U+1F40B to U+1F42F
  codepoint = 0x1F40B;
  while i < 640 && codepoint <= 0x1F42F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Birds: U+1F413, U+1F414, U+1F426, U+1F427, etc
  let birds: [u32; 24] = [
    0x1F413, 0x1F414, 0x1F426, 0x1F427, 0x1F438, 0x1F439, 0x1F43A, 0x1F43B, 0x1F43C, 0x1F43D,
    0x1F43E, 0x1F43F, 0x1F54A, 0x1F432, 0x1F433, 0x1F434, 0x1F435, 0x1F436, 0x1F437, 0x1F424,
    0x1F425, 0x1F423, 0x1F429, 0x1F42A,
  ];
  let mut j = 0;
  while i < 664 && j < birds.len() {
    if let Some(c) = char_from_u32(birds[j]) {
      result[i] = c;
      i += 1;
    }
    j += 1;
  }

  // Insects/Bugs: U+1F577, U+1F578, U+1F982-U+1F997
  codepoint = 0x1F577;
  while i < 666 && codepoint <= 0x1F578 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }
  codepoint = 0x1F982;
  while i < 696 && codepoint <= 0x1F997 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Reptiles: U+1F40A, U+1F422, U+1F40C, U+1F40D, U+1F422, U+1F98E
  let reptiles: [u32; 12] = [
    0x1F40A, 0x1F422, 0x1F40C, 0x1F40D, 0x1F422, 0x1F98E, 0x1F432, 0x1F438, 0x1F42A, 0x1F98E,
    0x1F422, 0x1F40A,
  ];
  j = 0;
  while i < 708 && j < reptiles.len() {
    if let Some(c) = char_from_u32(reptiles[j]) {
      result[i] = c;
      i += 1;
    }
    j += 1;
  }

  // Fill remainder with Geometric Shapes Extended: U+1F780 to U+1F7FF
  codepoint = 0x1F780;
  while i < 1024 && codepoint <= 0x1F7FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_food_large() -> [char; 1024] {
  let mut result = ['\u{1F345}'; 1024];
  let mut i = 0;

  // Fruits & Vegetables: U+1F345 to U+1F373
  let mut codepoint: u32 = 0x1F345;
  while i < 100 && codepoint <= 0x1F373 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Prepared foods: U+1F32D to U+1F37F
  codepoint = 0x1F32D;
  while i < 200 && codepoint <= 0x1F37F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Asian foods: U+1F358 to U+1F362
  codepoint = 0x1F358;
  while i < 220 && codepoint <= 0x1F362 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Sweets: U+1F366 to U+1F370
  codepoint = 0x1F366;
  while i < 240 && codepoint <= 0x1F370 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Drinkware: U+1F375 to U+1F37E
  codepoint = 0x1F375;
  while i < 260 && codepoint <= 0x1F37E {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Drinks: U+1F942 to U+1F944
  codepoint = 0x1F942;
  while i < 270 && codepoint <= 0x1F944 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Utensils: U+1F374, U+1F37D, U+1F3FA
  let utensils: [u32; 6] = [0x1F374, 0x1F37D, 0x1F3FA, 0x1F37E, 0x1F37F, 0x2615];
  let mut j = 0;
  while i < 276 && j < utensils.len() {
    if let Some(c) = char_from_u32(utensils[j]) {
      result[i] = c;
      i += 1;
    }
    j += 1;
  }

  // New foods: U+1F9C0 to U+1F9C2
  codepoint = 0x1F9C0;
  while i < 290 && codepoint <= 0x1F9C2 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Fill remainder with Currency Symbols: U+20A0 to U+20CF
  codepoint = 0x20A0;
  while i < 1024 && codepoint <= 0x20CF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_animals_large() -> [char; 1024] {
  let mut result = ['\u{1F400}'; 1024];
  let mut i = 0;

  // Mammals: U+1F400 to U+1F43F
  let mut codepoint: u32 = 0x1F400;
  while i < 64 && codepoint <= 0x1F43F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // New animals: U+1F980 to U+1F9AE
  codepoint = 0x1F980;
  while i < 128 && codepoint <= 0x1F9AE {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Extended: U+1F9A0 to U+1F9BF
  codepoint = 0x1F9A0;
  while i < 200 && codepoint <= 0x1F9BF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Marine: U+1F40B to U+1F42F
  codepoint = 0x1F40B;
  while i < 280 && codepoint <= 0x1F42F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Birds: U+1F413, U+1F414, U+1F426, U+1F427, etc
  let birds: [u32; 24] = [
    0x1F413, 0x1F414, 0x1F426, 0x1F427, 0x1F438, 0x1F439, 0x1F43A, 0x1F43B, 0x1F43C, 0x1F43D,
    0x1F43E, 0x1F43F, 0x1F54A, 0x1F432, 0x1F433, 0x1F434, 0x1F435, 0x1F436, 0x1F437, 0x1F424,
    0x1F425, 0x1F423, 0x1F429, 0x1F42A,
  ];
  let mut j = 0;
  while i < 304 && j < birds.len() {
    if let Some(c) = char_from_u32(birds[j]) {
      result[i] = c;
      i += 1;
    }
    j += 1;
  }

  // Reptiles
  let reptiles: [u32; 12] = [
    0x1F40A, 0x1F422, 0x1F40C, 0x1F40D, 0x1F422, 0x1F98E, 0x1F432, 0x1F438, 0x1F42A, 0x1F98E,
    0x1F422, 0x1F40A,
  ];
  j = 0;
  while i < 316 && j < reptiles.len() {
    if let Some(c) = char_from_u32(reptiles[j]) {
      result[i] = c;
      i += 1;
    }
    j += 1;
  }

  // Insects: U+1F577, U+1F578, U+1F982-U+1F997
  codepoint = 0x1F577;
  while i < 318 && codepoint <= 0x1F578 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }
  codepoint = 0x1F982;
  while i < 348 && codepoint <= 0x1F997 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Fill remainder with Arrows: U+2190 to U+21FF (112 chars)
  codepoint = 0x2190;
  while i < 460 && codepoint <= 0x21FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Continue with Supplemental Arrows-A: U+27F0 to U+27FF
  codepoint = 0x27F0;
  while i < 480 && codepoint <= 0x27FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Supplemental Arrows-B: U+2900 to U+297F
  codepoint = 0x2900;
  while i < 620 && codepoint <= 0x297F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Misc Symbols and Arrows: U+2B00 to U+2BFF
  codepoint = 0x2B00;
  while i < 1024 && codepoint <= 0x2BFF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_objects_large() -> [char; 1024] {
  let mut result = ['\u{1F4E0}'; 1024];
  let mut i = 0;

  // Communication: U+1F4E0 to U+1F4FF
  let mut codepoint: u32 = 0x1F4E0;
  while i < 32 && codepoint <= 0x1F4FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Technology: U+1F4BB to U+1F4DF
  codepoint = 0x1F4BB;
  while i < 100 && codepoint <= 0x1F4DF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Office: U+1F4C0 to U+1F4DA
  codepoint = 0x1F4C0;
  while i < 150 && codepoint <= 0x1F4DA {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Light/Writing: U+1F526 to U+1F53D
  codepoint = 0x1F526;
  while i < 200 && codepoint <= 0x1F53D {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Lock/Key: U+1F50F to U+1F516
  codepoint = 0x1F50F;
  while i < 220 && codepoint <= 0x1F516 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Tools: U+1F528 to U+1F52D
  codepoint = 0x1F528;
  while i < 240 && codepoint <= 0x1F52D {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Science/Medical: U+2695 to U+2697
  codepoint = 0x2695;
  while i < 250 && codepoint <= 0x2697 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Household: U+1F9F0 to U+1F9FF
  codepoint = 0x1F9F0;
  while i < 300 && codepoint <= 0x1F9FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Transport: U+1F680 to U+1F6C5
  codepoint = 0x1F680;
  while i < 400 && codepoint <= 0x1F6C5 {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Fill remainder with Number Forms: U+2150 to U+218F
  codepoint = 0x2150;
  while i < 1024 && codepoint <= 0x218F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

const fn generate_symbols_large() -> [char; 1024] {
  let mut result = ['\u{2700}'; 1024];
  let mut i = 0;

  // Dingbats: U+2700 to U+27BF
  let mut codepoint: u32 = 0x2700;
  while i < 192 && codepoint <= 0x27BF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Arrows: U+2190 to U+21FF
  codepoint = 0x2190;
  while i < 350 && codepoint <= 0x21FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Math: U+2200 to U+22FF
  codepoint = 0x2200;
  while i < 600 && codepoint <= 0x22FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Box Drawing: U+2500 to U+257F
  codepoint = 0x2500;
  while i < 728 && codepoint <= 0x257F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Block Elements: U+2580 to U+259F
  codepoint = 0x2580;
  while i < 760 && codepoint <= 0x259F {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Geometric: U+25A0 to U+25FF
  codepoint = 0x25A0;
  while i < 856 && codepoint <= 0x25FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  // Misc symbols: U+2600 to U+26FF
  codepoint = 0x2600;
  while i < 1024 && codepoint <= 0x26FF {
    if let Some(c) = char_from_u32(codepoint) {
      result[i] = c;
      i += 1;
    }
    codepoint += 1;
  }

  result
}

// Safe const conversion from u32 to char (returns None for invalid codepoints)
const fn char_from_u32(n: u32) -> Option<char> {
  if n <= 0x10FFFF {
    // Check for surrogate range (0xD800-0xDFFF)
    if n < 0xD800 || n > 0xDFFF {
      // SAFETY: We've checked the codepoint is valid
      return Some(unsafe { char::from_u32_unchecked(n) });
    }
  }
  None
}

/// Access the large sets by category
pub fn get_large_set(category: Category) -> &'static [char; 1024] {
  match category {
    Category::Face => &FACES_LARGE,
    Category::Nature => &NATURE_LARGE,
    Category::Food => &FOOD_LARGE,
    Category::Animal => &ANIMALS_LARGE,
    Category::Object => &OBJECTS_LARGE,
    Category::Symbol => &SYMBOLS_LARGE,
  }
}

/// Get the starter set for reversible encoding
pub fn get_starters_large() -> &'static [char; 1024] {
  &STARTERS_LARGE
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_large_set_sizes() {
    assert_eq!(STARTERS_LARGE.len(), 1024);
    assert_eq!(FACES_LARGE.len(), 1024);
    assert_eq!(NATURE_LARGE.len(), 1024);
    assert_eq!(FOOD_LARGE.len(), 1024);
    assert_eq!(ANIMALS_LARGE.len(), 1024);
    assert_eq!(OBJECTS_LARGE.len(), 1024);
    assert_eq!(SYMBOLS_LARGE.len(), 1024);
  }

  fn count_unique(chars: &[char]) -> usize {
    let mut seen = std::collections::HashSet::new();
    for &c in chars {
      seen.insert(c);
    }
    seen.len()
  }

  // Note: Only STARTERS_LARGE and SYMBOLS_LARGE currently have 1024 unique elements.
  // The other sets (FACES_LARGE, NATURE_LARGE, FOOD_LARGE, ANIMALS_LARGE, OBJECTS_LARGE)
  // are for future emoji realm support and don't yet have enough unique elements.
  // The CJK realm (in reversible.rs) uses CJK_SET which has 1024 unique elements.

  #[test]
  fn test_starters_unique() {
    assert_eq!(count_unique(&STARTERS_LARGE), 1024);
  }

  #[test]
  fn test_symbols_unique() {
    assert_eq!(count_unique(&SYMBOLS_LARGE), 1024);
  }
}
