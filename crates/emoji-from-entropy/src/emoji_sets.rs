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

/// The curated emoji set.
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
            vec![Category::Nature, Category::Food, Category::Animal, Category::Object, Category::Symbol]
        } else {
            vec![Category::Nature, Category::Food, Category::Animal, Category::Object]
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

// Starter emojis (first position, encodes config)
const STARTERS: &[char] = &[
    '\u{1F332}', '\u{1F981}', '\u{1F355}', '\u{1F30A}', '\u{26A1}', 
    '\u{1F525}', '\u{2B50}', '\u{1F319}', '\u{1F30D}', '\u{1F3A8}',
    '\u{1F680}', '\u{1F3B5}', '\u{1F4DA}', '\u{1F52E}', '\u{1F48E}',
];

// Face emojis (abbreviated)
pub const FACES: &[char] = &[
    '\u{1F600}', '\u{1F603}', '\u{1F604}', '\u{1F601}', '\u{1F606}',
    '\u{1F605}', '\u{1F602}', '\u{1F923}', '\u{1F60A}', '\u{1F607}',
];

// Nature emojis (abbreviated)
pub const NATURE: &[char] = &[
    '\u{1F330}', '\u{1F331}', '\u{1F332}', '\u{1F333}', '\u{1F334}',
    '\u{1F335}', '\u{1F337}', '\u{1F338}', '\u{1F339}', '\u{1F33A}',
];

// Food emojis (abbreviated)
pub const FOOD: &[char] = &[
    '\u{1F345}', '\u{1F346}', '\u{1F347}', '\u{1F348}', '\u{1F349}',
    '\u{1F34A}', '\u{1F34B}', '\u{1F34C}', '\u{1F34D}', '\u{1F96D}',
];

// Animal emojis (abbreviated)
pub const ANIMALS: &[char] = &[
    '\u{1F400}', '\u{1F401}', '\u{1F402}', '\u{1F403}', '\u{1F404}',
    '\u{1F405}', '\u{1F406}', '\u{1F407}', '\u{1F408}', '\u{1F409}',
];

// Object emojis (abbreviated)
pub const OBJECTS: &[char] = &[
    '\u{1F4E0}', '\u{1F4E1}', '\u{1F4E2}', '\u{1F4E3}', '\u{1F4E4}',
    '\u{1F4E5}', '\u{1F4E6}', '\u{1F4E7}', '\u{1F4E8}', '\u{1F4E9}',
];

// Symbol emojis (abbreviated)
pub const SYMBOLS: &[char] = &[
    '\u{2700}', '\u{2701}', '\u{2702}', '\u{2703}', '\u{2704}',
    '\u{2705}', '\u{2706}', '\u{2707}', '\u{2708}', '\u{2709}',
];
