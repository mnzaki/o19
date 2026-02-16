//! emoji-from-entropy: Generative identity encoding from cryptographic entropy.
//!
//! Maps arbitrary-length entropy (commonly 256-bit Ed25519 public keys) to 
//! memorable emoji strings. Optimized for 256-bit case.

use std::fmt;

pub mod emoji_sets;
pub mod url;

use emoji_sets::EmojiSet;

/// Number of bits encoded in the choice emoji.
pub const CHOICE_BITS: usize = 10;

/// Number of bits per entropy emoji (with ~1000 emoji set).
pub const BITS_PER_EMOJI: usize = 10;

/// Emoji configuration encoded in the choice emoji's bits.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EmojiConfig {
    /// Starting pattern.
    pub pattern: Pattern,
    /// Base face frequency 0-3 mapped to 15-45%.
    pub face_frequency: u8,
    /// How face frequency changes over the string.
    pub curve: Curve,
    /// Number of non-faces at the end (0-7).
    pub num_end_things: u8,
    /// Whether to include symbol category.
    pub include_symbols: bool,
}

/// Pattern types for emoji sequences.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Pattern {
    /// O-O-F: Observe, observe, react.
    OOF = 0,
    /// O-F-F: Observe, react, react.
    OFF = 1,
    /// O-F-O-F: Alternating.
    OFOF = 2,
    /// F-O-O: Social butterfly.
    FOO = 3,
}

/// Curve types for face frequency variation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Curve {
    Constant = 0,
    Increasing = 1,
    Decreasing = 2,
    Sinusoidal = 3,
}

impl EmojiConfig {
    /// Decode configuration from choice bits.
    pub fn from_choice_bits(bits: u16) -> Self {
        Self {
            pattern: match bits & 0b11 {
                0 => Pattern::OOF,
                1 => Pattern::OFF,
                2 => Pattern::OFOF,
                _ => Pattern::FOO,
            },
            face_frequency: ((bits >> 2) & 0b11) as u8,
            curve: match (bits >> 4) & 0b11 {
                0 => Curve::Constant,
                1 => Curve::Increasing,
                2 => Curve::Decreasing,
                _ => Curve::Sinusoidal,
            },
            num_end_things: ((bits >> 6) & 0b111) as u8,
            include_symbols: ((bits >> 9) & 0b1) == 1,
        }
    }

    /// Encode configuration to choice bits.
    pub fn to_choice_bits(&self) -> u16 {
        let pattern_bits = self.pattern as u16;
        let freq_bits = (self.face_frequency as u16 & 0b11) << 2;
        let curve_bits = (self.curve as u16) << 4;
        let end_bits = (self.num_end_things as u16 & 0b111) << 6;
        let symbol_bit = (self.include_symbols as u16) << 9;
        pattern_bits | freq_bits | curve_bits | end_bits | symbol_bit
    }

    /// Get face frequency as ratio (0.15 to 0.45).
    pub fn face_ratio(&self) -> f32 {
        0.15 + (self.face_frequency as f32 / 3.0) * 0.30
    }

    /// Calculate required emoji count for given entropy bits.
    pub fn emoji_count_for_entropy(&self, entropy_bits: usize) -> usize {
        // Ceiling division: (entropy_bits + 9) / 10
        (entropy_bits + BITS_PER_EMOJI - 1) / BITS_PER_EMOJI
    }
}

impl Default for EmojiConfig {
    fn default() -> Self {
        Self {
            pattern: Pattern::OOF,
            face_frequency: 1,
            curve: Curve::Constant,
            num_end_things: 0,
            include_symbols: false,
        }
    }
}

/// An emoji-encoded identity.
#[derive(Debug, Clone, PartialEq)]
pub struct EmojiIdentity {
    /// The emoji string.
    pub string: String,
    /// Configuration (from choice emoji).
    pub config: EmojiConfig,
    /// The original entropy.
    pub entropy: Vec<u8>,
}

impl EmojiIdentity {
    /// Create from arbitrary-length entropy (generic, any length).
    pub fn from_entropy(entropy: &[u8]) -> Self {
        let _entropy_bits = entropy.len() * 8;
        
        // Extract choice bits from first bytes
        let choice_value = ((entropy[0] as u16) << 2) | ((entropy[1] as u16 & 0xC0) >> 6);
        let config = EmojiConfig::from_choice_bits(choice_value);
        
        // Generate the emoji string
        let string = generate_string(entropy, &config);

        Self {
            string,
            config,
            entropy: entropy.to_vec(),
        }
    }

    /// Create from 256-bit entropy (optimized fast path).
    /// 
    /// This is the common case (Ed25519 public keys). Uses const generics
    /// and pre-allocated buffers for efficiency.
    pub fn from_256_bits(entropy: [u8; 32]) -> Self {
        // For 256 bits: 10 bits in choice, 246 bits remaining
        // 25 emojis at 10 bits each = 250 bits (4 bits unused)
        const TARGET_EMOJI: usize = 26; // 1 choice + 25 entropy
        
        let choice_value = ((entropy[0] as u16) << 2) | ((entropy[1] as u16 & 0xC0) >> 6);
        let config = EmojiConfig::from_choice_bits(choice_value);
        
        let emoji_set = EmojiSet::new(config.include_symbols);
        let first = emoji_set.first_emoji(entropy[0], entropy[1]);
        
        // Pre-allocate with capacity
        let mut result = String::with_capacity(TARGET_EMOJI * 4);
        result.push(first);
        
        // Fast path: process 25 emojis with bit extraction
        let mut bits: u64 = 0;
        let mut bit_count: usize = 0;
        let mut byte_idx: usize = 2; // Start after first 2 bytes
        
        for i in 1..TARGET_EMOJI {
            // Load more bits if needed
            while bit_count < BITS_PER_EMOJI && byte_idx < 32 {
                bits = (bits << 8) | (entropy[byte_idx] as u64);
                bit_count += 8;
                byte_idx += 1;
            }
            
            // Check if we're in ending "things only" section
            let from_end = TARGET_EMOJI - i;
            if from_end <= config.num_end_things as usize {
                result.push(emoji_set.random_other(i));
                continue;
            }
            
            // Extract 10 bits for emoji selection
            if bit_count >= BITS_PER_EMOJI {
                bit_count -= BITS_PER_EMOJI;
                let value = ((bits >> bit_count) & 0x3FF) as usize;
                
                let emoji = if should_be_face(i, TARGET_EMOJI, &config) {
                    emoji_set.random_face(value)
                } else {
                    emoji_set.random_other(value)
                };
                
                result.push(emoji);
            } else {
                // Fallback if we run out of bits
                result.push(emoji_set.random_other(i));
            }
        }

        Self {
            string: result,
            config,
            entropy: entropy.to_vec(),
        }
    }

    /// Get the short form (first N emojis) for display.
    /// 
    /// Default N=4 gives ~30 bits of displayed entropy (plus 10 bits in choice = 40 bits total).
    /// Use N=5 for ~40 bits entropy (50 bits with choice), N=6 for ~50 bits (60 bits with choice).
    pub fn short(&self, n: usize) -> String {
        self.string.chars().take(n.max(1)).collect()
    }

    /// Get short form with default 4 emojis (backwards compatible).
    pub fn short_default(&self) -> String {
        self.short(4)
    }

    /// Verify this identity matches given entropy.
    pub fn verify(&self, entropy: &[u8]) -> bool {
        self.entropy == entropy
    }

    /// Get full emoji count.
    pub fn len(&self) -> usize {
        self.string.chars().count()
    }

    pub fn is_empty(&self) -> bool {
        self.string.is_empty()
    }
}

impl fmt::Display for EmojiIdentity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.string)
    }
}

/// Generate emoji string from arbitrary entropy.
fn generate_string(entropy: &[u8], config: &EmojiConfig) -> String {
    let emoji_set = EmojiSet::new(config.include_symbols);
    let entropy_bits = entropy.len() * 8;
    let remaining_bits = entropy_bits.saturating_sub(CHOICE_BITS);
    let target_emoji = 1 + config.emoji_count_for_entropy(remaining_bits);

    let first = emoji_set.first_emoji(entropy[0], entropy[1]);
    
    let mut result = String::with_capacity(target_emoji * 4);
    result.push(first);
    
    let mut bits: u64 = 0;
    let mut bit_count: usize = 0;
    let mut byte_idx: usize = 2; // Start after first 2 bytes
    
    for i in 1..target_emoji {
        let from_end = target_emoji - i;
        if from_end <= config.num_end_things as usize {
            result.push(emoji_set.random_other(i));
            continue;
        }
        
        // Load more bits if needed
        while bit_count < BITS_PER_EMOJI && byte_idx < entropy.len() {
            bits = (bits << 8) | (entropy[byte_idx] as u64);
            bit_count += 8;
            byte_idx += 1;
        }
        
        if bit_count >= BITS_PER_EMOJI {
            bit_count -= BITS_PER_EMOJI;
            let value = ((bits >> bit_count) & 0x3FF) as usize;
            
            let emoji = if should_be_face(i, target_emoji, config) {
                emoji_set.random_face(value)
            } else {
                emoji_set.random_other(value)
            };
            
            result.push(emoji);
        } else {
            // Not enough bits left
            result.push(emoji_set.random_other(i));
        }
    }
    
    result
}

/// Determine if position should be a face.
fn should_be_face(position: usize, total: usize, config: &EmojiConfig) -> bool {
    let from_end = total - position;
    if from_end <= config.num_end_things as usize {
        return false;
    }
    
    let base_ratio = config.face_ratio();
    let adjusted = match config.curve {
        Curve::Constant => base_ratio,
        Curve::Increasing => {
            let p = position as f32 / total as f32;
            base_ratio * (0.5 + 0.5 * p)
        }
        Curve::Decreasing => {
            let p = position as f32 / total as f32;
            base_ratio * (1.0 - 0.5 * p)
        }
        Curve::Sinusoidal => {
            let p = position as f32 / total as f32;
            let sine = (p * std::f32::consts::PI * 2.0).sin();
            base_ratio * (0.7 + 0.3 * sine)
        }
    };
    
    let hash = (position * 31 + config.face_frequency as usize) % 100;
    (hash as f32 / 100.0) < adjusted
}

/// Handle to a running listener.
#[derive(Debug)]
pub struct ListenerHandle {
    /// The underlying thread handle.
    #[doc(hidden)]
    pub _handle: std::thread::JoinHandle<()>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_roundtrip() {
        for bits in 0..1024 {
            let config = EmojiConfig::from_choice_bits(bits);
            assert_eq!(config.to_choice_bits(), bits);
        }
    }

    #[test]
    fn test_identity_256_bits() {
        let entropy = [42u8; 32];
        let identity = EmojiIdentity::from_256_bits(entropy);
        
        assert!(!identity.string.is_empty());
        assert_eq!(identity.entropy.len(), 32);
        assert!(identity.verify(&entropy));
        
        // Should have ~26 emojis
        assert!(identity.len() >= 20 && identity.len() <= 30);
    }

    #[test]
    fn test_identity_arbitrary_entropy() {
        let entropy = vec![1u8; 64]; // 512 bits
        let identity = EmojiIdentity::from_entropy(&entropy);
        
        assert!(!identity.string.is_empty());
        assert_eq!(identity.entropy.len(), 64);
        
        // Should have more emojis for more entropy
        assert!(identity.len() > 26);
    }

    #[test]
    fn test_short_form() {
        let entropy = [0u8; 32];
        let identity = EmojiIdentity::from_256_bits(entropy);
        
        assert_eq!(identity.short(4).chars().count(), 4);
        assert_eq!(identity.short(5).chars().count(), 5);
        assert_eq!(identity.short(6).chars().count(), 6);
        
        // Short forms should be prefixes of full string
        assert!(identity.string.starts_with(&identity.short(4)));
    }

    #[test]
    fn test_different_entropy_produces_different_strings() {
        let entropy1 = [0u8; 32];
        let entropy2 = [1u8; 32];
        
        let id1 = EmojiIdentity::from_256_bits(entropy1);
        let id2 = EmojiIdentity::from_256_bits(entropy2);
        
        assert_ne!(id1.string, id2.string);
    }

    #[test]
    fn test_emoji_count_calculation() {
        let config = EmojiConfig::default();
        
        // 246 bits needed (256 - 10 for choice)
        assert_eq!(config.emoji_count_for_entropy(246), 25);
        
        // 502 bits needed (512 - 10)
        assert_eq!(config.emoji_count_for_entropy(502), 51);
    }
}
