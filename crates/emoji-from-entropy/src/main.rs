//! Demo of the three "skools" of emoji/character encoding.
//!
//! Run with: cargo run

use emoji_from_entropy::reversible::{self, Skool};
use emoji_from_entropy::EmojiIdentity;

pub fn main() {
    println!("=== The Three Skools of Entropy Encoding ===\n");

    demo_oldskool();
    demo_cjkskool();
    // newskool skipped - needs 1024 unique emoji (currently has duplicates)

    println!("\n=== Multiple Representations Demo ===\n");
    demo_multiple_representations();
}

/// Oldskool: Original irreversible emoji encoding.
fn demo_oldskool() {
    println!("🏫 OLDSKOOL");
    println!("   The original irreversible emoji encoding.");
    println!("   Uses random selection from emoji sets.");
    println!();

    let entropy: [u8; 32] = rand::random();
    let identity = EmojiIdentity::from_256_bits_oldskool(entropy);

    println!("   Entropy: {:?}...", &entropy[..4]);
    println!("   Output:  {}", identity);
    println!();
}

/// Cjkskool: Reversible encoding mixing CJK with Braille, Arrows, Geometric, etc.
fn demo_cjkskool() {
    println!("🏫 CJKSKOOL");
    println!("   Reversible encoding with CJK + mixed symbol sets.");
    println!("   Uses: CJK, Braille, Arrows, Geometric, Number Forms, Letterlike");
    println!();

    let entropy: [u8; 32] = rand::random();
    let (encoded, config, skool) = reversible::encode_256(&entropy, Some(Skool::Cjkskool));

    println!("   Entropy: {:?}...", &entropy[..4]);
    println!("   Output:  {}", encoded);
    println!("   Skool:   {}", skool);
    println!("   Config:  {:?}", config);

    // Verify round-trip
    if let Some((decoded, _, decoded_skool)) = reversible::decode_256(&encoded) {
        println!("   ✓ Decoded choice: {:?}", &decoded[..2]);
        println!("   ✓ Skool detected: {}", decoded_skool);
    }
    println!();
}

/// Demonstrate multiple representations with different choice characters.
fn demo_multiple_representations() {
    println!("Same entropy, different cjkskool representations:");
    println!();

    let entropy: [u8; 32] = rand::random();
    println!("   Base entropy: {:?}...", &entropy[..4]);
    println!();

    // Different valid CJK choice characters give different representations
    let choice_values = [0x001u16, 0x100, 0x3FF];
    println!("   CJKSKOOL variants:");
    for choice in choice_values {
        let (encoded, _, _) = reversible::encode_cjkskool_256(
            &entropy,
            choice,
            emoji_from_entropy::EmojiConfig::default(),
        );
        let first_char = encoded.chars().next().unwrap();
        println!("     Choice 0x{:03X} ({}): {}", choice, first_char, encoded);
    }
    println!();

    // Show skool detection
    println!("   Skool auto-detection:");
    let test_chars = ['一', '龠', '☀', '🌱', 'A'];
    for c in test_chars {
        let skool = Skool::from_choice(c);
        println!("     '{}' → {}", c, skool);
    }
}
