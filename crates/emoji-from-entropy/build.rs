use std::env;
use std::fs;
use std::path::Path;

fn main() {
    let out_dir = env::var_os("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("emoji_arrays.rs");

    let starters = generate_starters();
    let faces = generate_faces();
    let nature = generate_nature();
    let food = generate_food();
    let animals = generate_animals();
    let objects = generate_objects();
    let symbols = generate_symbols();

    fs::write(
        &dest_path,
        format!(
            "pub const STARTERS: [char; 1024] = {:?};\n\
             pub const FACES: [char; 1024] = {:?};\n\
             pub const NATURE: [char; 1024] = {:?};\n\
             pub const FOOD: [char; 1024] = {:?};\n\
             pub const ANIMALS: [char; 1024] = {:?};\n\
             pub const OBJECTS: [char; 1024] = {:?};\n\
             pub const SYMBOLS: [char; 1024] = {:?};\n",
            starters, faces, nature, food, animals, objects, symbols
        ),
    ).unwrap();
    
    println!("cargo::rerun-if-changed=build.rs");
}

fn generate_starters() -> [char; 1024] {
    let mut result = ['\u{1F332}'; 1024];
    let plants = [
        '\u{1F332}', '\u{1F333}', '\u{1F334}', '\u{1F335}', '\u{1F340}', '\u{1F341}',
        '\u{1F342}', '\u{1F343}', '\u{1F3F5}', '\u{1F38B}',
    ];
    let weather = [
        '\u{1F30A}', '\u{1F30B}', '\u{1F30C}', '\u{26A1}', '\u{2600}', '\u{1F319}',
        '\u{1F525}', '\u{2B50}', '\u{1F300}', '\u{1F308}',
    ];
    let transport = [
        '\u{1F680}', '\u{1F681}', '\u{1F682}', '\u{1F683}', '\u{1F684}', '\u{1F685}',
        '\u{1F686}', '\u{1F687}', '\u{1F688}', '\u{1F689}',
    ];
    let activities = [
        '\u{1F3A8}', '\u{1F3B5}', '\u{1F3B6}', '\u{1F3B7}', '\u{1F3B8}', '\u{1F3B9}',
        '\u{1F3BA}', '\u{1F3BB}', '\u{1F3BC}', '\u{1F3BD}',
    ];
    
    for i in 0..1024 {
        let category = i % 4;
        let idx = (i / 4) % 10;
        result[i] = match category {
            0 => plants[idx],
            1 => weather[idx],
            2 => transport[idx],
            3 => activities[idx],
            _ => '\u{1F332}',
        };
    }
    result
}

fn generate_faces() -> [char; 1024] {
    // Use valid emoji codepoints from the emoticons block
    let base_faces: Vec<char> = (0x1F600..=0x1F64F)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{1F600}'; 1024];
    for i in 0..1024 {
        result[i] = base_faces[i % base_faces.len()];
    }
    result
}

fn generate_nature() -> [char; 1024] {
    let base_nature: Vec<char> = (0x1F330..=0x1F35F)
        .chain(0x1F400..=0x1F42F)
        .chain(0x2600..=0x26FF)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{1F330}'; 1024];
    for i in 0..1024 {
        result[i] = base_nature[i % base_nature.len()];
    }
    result
}

fn generate_food() -> [char; 1024] {
    let base_food: Vec<char> = (0x1F345..=0x1F37F)
        .chain(0x2615..=0x2615)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{1F345}'; 1024];
    for i in 0..1024 {
        result[i] = base_food[i % base_food.len()];
    }
    result
}

fn generate_animals() -> [char; 1024] {
    let base_animals: Vec<char> = (0x1F400..=0x1F43F)
        .chain(0x1F980..=0x1F9AE)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{1F400}'; 1024];
    for i in 0..1024 {
        result[i] = base_animals[i % base_animals.len()];
    }
    result
}

fn generate_objects() -> [char; 1024] {
    let base_objects: Vec<char> = (0x1F4A0..=0x1F4FF)
        .chain(0x1F50D..=0x1F530)
        .chain(0x1F380..=0x1F3C0)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{1F4E0}'; 1024];
    for i in 0..1024 {
        result[i] = base_objects[i % base_objects.len()];
    }
    result
}

fn generate_symbols() -> [char; 1024] {
    let base_symbols: Vec<char> = (0x2700..=0x27BF)
        .chain(0x2190..=0x21FF)
        .chain(0x25A0..=0x25FF)
        .filter_map(|c| char::from_u32(c))
        .collect();
    
    let mut result = ['\u{2700}'; 1024];
    for i in 0..1024 {
        result[i] = base_symbols[i % base_symbols.len()];
    }
    result
}
