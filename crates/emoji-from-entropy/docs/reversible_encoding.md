# Reversible Emoji Encoding

> Making emoji-from-entropy bijective: emoji ↔ entropy

## The Problem

Current implementation uses **random selection** from emoji sets based on entropy bits:

```rust
// Current (irreversible)
let emoji = emoji_set.random_face(value);  // Many entropy values → same emoji
```

This creates a many-to-one mapping. We cannot recover the original entropy from the emoji string.

## The Solution: Deterministic Index Mapping

Make the encoding **bijective** by using entropy bits as direct indices into ordered emoji sets.

### Encoding

```
┌─────────────────────────────────────────────────────────────┐
│  Entropy (256 bits)                                         │
│  ┌──────────┬──────────────────────────────────────────┐   │
│  │ 10 bits  │ 246 bits (25 × 10 bits - 4 bits unused)  │   │
│  │ Choice   │ Emoji indices                            │   │
│  └──────────┴──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
   ┌──────────┐              ┌────────────────────┐
   │ Config   │              │ Emoji Selection    │
   │ - Pattern│              │ bits[0:10] → idx0  │
   │ - Sets   │              │ bits[10:20] → idx1 │
   │ - Curve  │              │ ...                │
   └──────────┘              └────────────────────┘
         │                            │
         └────────────┬───────────────┘
                      ▼
              ┌──────────────┐
              │ Emoji String │
              │ 😀🌲📡🍕🚀... │
              └──────────────┘
```

### Decoding

```
┌──────────────┐
│ Emoji String │
│ 😀🌲📡🍕🚀... │
└──────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ 1. First emoji → Choice bits (10 bits) │
│    - Decode config (pattern, sets)      │
│                                         │
│ 2. For each subsequent emoji:          │
│    - Determine which set to use         │
│      (based on pattern + position)      │
│    - Find emoji index in that set       │
│    - Append 10 bits to output           │
│                                         │
│ 3. Pad to 256 bits                      │
└─────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│ Entropy (256)│
└──────────────┘
```

## Implementation

### 1. Ordered Emoji Sets

Emoji sets must be **sorted deterministically** (e.g., by Unicode codepoint):

```rust
/// Ordered emoji set for reversible encoding.
pub struct OrderedEmojiSet {
    /// Sorted list of emoji codepoints.
    emojis: Vec<char>,
    /// Number of bits needed to index (ceil(log2(len))).
    bits_per_emoji: usize,
}

impl OrderedEmojiSet {
    /// Get emoji at index (encoding).
    pub fn get(&self, index: usize) -> char {
        self.emojis[index % self.emojis.len()]
    }
    
    /// Find index of emoji (decoding).
    pub fn index_of(&self, emoji: char) -> Option<usize> {
        self.emojis.binary_search(&emoji).ok()
    }
}
```

### 2. Pattern-Aware Set Selection

The pattern (O-O-F, O-F-F, etc.) determines which set to use for each position:

```rust
pub enum Pattern {
    OOF,   // Face, Face, Other, Face, Face, Other...
    OFF,   // Face, Other, Other, Face, Other, Other...
    OFOF,  // Face, Other, Face, Other...
    FOO,   // Other, Face, Face, Other, Face, Face...
}

/// Determine which emoji set to use for position N.
fn set_for_position(pattern: Pattern, position: usize) -> EmojiSetType {
    match pattern {
        Pattern::OOF => match position % 3 {
            0 | 1 => EmojiSetType::Face,
            _ => EmojiSetType::Other,
        },
        Pattern::OFOF => match position % 2 {
            0 => EmojiSetType::Face,
            _ => EmojiSetType::Other,
        },
        // ... etc
    }
}
```

### 3. Bit Extraction

Encoding:

```rust
fn encode_entropy(entropy: &[u8; 32], config: EmojiConfig) -> String {
    let mut result = String::new();
    
    // First emoji is choice (config)
    let choice_emoji = encode_choice(config);
    result.push(choice_emoji);
    
    // Remaining bits as emoji indices
    let mut bit_stream = BitStream::new(&entropy[2..]); // Skip first 2 bytes (used by choice)
    
    for position in 1..TARGET_EMOJI_COUNT {
        let set_type = set_for_position(config.pattern, position);
        let emoji_set = get_set(config, set_type);
        
        // Extract exactly bits_per_emoji bits
        let bits = bit_stream.take(emoji_set.bits_per_emoji());
        let index = bits as usize % emoji_set.len();
        
        result.push(emoji_set.get(index));
    }
    
    result
}
```

Decoding:

```rust
fn decode_to_entropy(emoji_string: &str) -> Result<[u8; 32], Error> {
    let mut chars = emoji_string.chars();
    
    // First emoji → config
    let choice_emoji = chars.next().ok_or(Error::Empty)?;
    let config = decode_choice(choice_emoji)?;
    
    // Build bit stream from remaining emoji
    let mut bit_stream = BitStream::new();
    
    for (position, emoji) in chars.enumerate() {
        let set_type = set_for_position(config.pattern, position + 1);
        let emoji_set = get_set(config, set_type);
        
        let index = emoji_set.index_of(emoji)
            .ok_or(Error::UnknownEmoji(emoji))?;
        
        // Append index as bits
        bit_stream.push(index as u64, emoji_set.bits_per_emoji());
    }
    
    // Reconstruct 256 bits
    let mut result = [0u8; 32];
    result[0..2].copy_from_slice(&config.to_bytes());
    result[2..].copy_from_slice(&bit_stream.to_bytes());
    
    Ok(result)
}
```

## Set Size Considerations

For true reversibility, the emoji sets must have sizes that are powers of 2:

| Set Size | Bits per Emoji | Max Index |
|----------|----------------|-----------|
| 512      | 9 bits         | 0-511     |
| 1024     | 10 bits        | 0-1023    |
| 2048     | 11 bits        | 0-2047    |

**Problem**: We curate ~1000 emojis per category (not exactly 1024).

**Solution A**: Pad to 1024 with "null" emojis (wasteful).

**Solution B**: Use 10 bits anyway, accept that some indices map to "next" emoji set (deterministic mapping).

**Solution C**: Use variable bits per position based on set size:
- Face set (950 emoji) → 10 bits, index 950-1023 wrap to 0-73
- Nature set (1000 emoji) → 10 bits, index 1000-1023 wrap to 0-23

All solutions are deterministic and reversible.

## Benefits

1. **Transmit only emoji**: No need for parallel NodeId transmission
2. **Shorter URLs**: `o19://😀🌲📡🍕/pair?device=Phone` (no `nodeId` param)
3. **Human-verifiable AND machine-decodable**: Same string serves both purposes
4. **Still memorable**: Pattern + emoji categories create memorable sequences

## Trade-offs

1. **Longer emoji strings**: Need ~26 emoji for 256 bits (same as current)
2. **Set curation constraints**: Must maintain consistent sets across versions
3. **No "short form"**: Can't truncate without losing information

## Migration Path

Keep current generative encoding as default, add reversible as opt-in:

```rust
impl EmojiIdentity {
    /// Current generative encoding (default, irreversible).
    pub fn from_256_bits(entropy: [u8; 32]) -> Self;
    
    /// New reversible encoding.
    pub fn from_256_bits_reversible(entropy: [u8; 32]) -> Self;
    
    /// Decode reversible encoding.
    pub fn to_entropy(&self) -> Option<[u8; 32]>;
}
```

## Conclusion

Reversible emoji encoding is feasible and adds significant value for device pairing. The implementation requires:

1. Deterministic emoji set ordering
2. Position-aware set selection based on pattern
3. Bit-precise index mapping

The result: a single emoji string that humans recognize and machines can decode to recover the full cryptographic identity.

🌲😀🍕📡
