# emoji-from-entropy

> *Generative identity encoding from cryptographic entropy.*

## The Core Idea

Cryptographic keys are high-entropy bitstrings. Humans can't remember them. But humans **can** remember emoji stories.

This crate maps arbitrary-length entropy (commonly 256-bit Ed25519 public keys) to memorable emoji strings. The first emoji is a **choice** emoji that encodes generation parameters; the rest encode the entropy itself.

## The Format

```
pkb://🌲😀🍕📡/notes/diary/2024/My Day.js.md?v=abc123#char=10,250
      │           │   │                              │    │
      │           │   │                              │    └── Xanadu anchor
      │           │   │                              └── Version (commit hash)
      │           │   └── Path within repository
      │           └── Repository name
      └── Emoji identity (this crate's output)
```

## The Choice Emoji (First Position)

The first emoji is special—we call it the **choice emoji**. Its Unicode codepoint encodes 10 bits of generation parameters:

| Bits | Field | Values |
|------|-------|--------|
| 0-1 | Pattern | O-O-F (0), O-F-F (1), O-F-O-F (2), F-O-O (3) |
| 2-3 | Face Frequency | 15%, 25%, 35%, 45% of emojis are faces |
| 4-5 | Curve | Constant, Increasing, Decreasing, Sinusoidal |
| 6-8 | End Things | 0-7 non-faces at the end |
| 9 | Symbols | Include symbol category? |

This leaves **246 bits** (256 - 10) to be encoded in the remaining emojis.

## Bits Per Emoji

Each subsequent emoji carries **~10 bits** of entropy:

| Emoji Set Size | Bits per Emoji |
|----------------|----------------|
| 1,024 (1K) | 10 bits |
| 2,048 (2K) | 11 bits |
| 4,096 (4K) | 12 bits |

We curate ~1,000 emojis per category (faces, nature, food, animals, objects, symbols), giving us **~10 bits per emoji**.

To encode 246 remaining bits:
- **25 emojis** at 10 bits each = 250 bits (our target)
- **23 emojis** at 11 bits each = 253 bits (if using 2K set)
- **21 emojis** at 12 bits each = 252 bits (if using 4K set)

Total length: **26 emojis** (1 choice + 25 entropy) for 256-bit keys.

## The Short Form: Why 5 Emojis?

For display purposes, we show only the first N emojis. But what's the collision risk?

### Collision Probability Analysis

With **5 emojis** (1 choice + 4 entropy) at ~10 bits per entropy emoji:
- Total displayed entropy: **40 bits**
- Collision probability for random match: **1 in 2^40** (~1 trillion)
- Birthday paradox threshold: **2^20 ≈ 1 million** identities before ~50% collision chance

Wait—this is too risky for global scale. Let's recalculate for **N=5** (4 entropy emojis):

| Network Size | Collision Probability (4 entropy emojis = 40 bits) |
|--------------|-----------------------------------------------------|
| 1,000 devices | ~0.0001% (negligible) |
| 100,000 devices | ~0.9% (still low) |
| 1 million devices | ~47% (approaching even odds) |
| 1 billion devices | ~100% (guaranteed collisions) |

With **5 entropy emojis (N=6 total)** = 50 bits:
- Birthday threshold: **2^25 ≈ 33 million** identities
- 1 billion devices: ~10% collision chance

With **6 entropy emojis (N=7 total)** = 60 bits:
- Birthday threshold: **2^30 ≈ 1 billion** identities
- 1 billion devices: ~0.1% collision chance

**Recommendation: N=5** (5 emojis total, 4 entropy) for small networks (<100K), **N=6 or N=7** for global scale.

Default is **N=4** (short form = 4 emojis) because:
- It's visually compact
- For personal device recognition, collisions don't matter (you know your devices)
- For global lookup, use the full string

### The Math (Birthday Paradox)

For M identities and B bits of entropy:
```
P(collision) ≈ M² / (2 × 2^B)
```

For 1 million devices and 40 bits:
```
P ≈ (10^6)² / (2 × 2^40) ≈ 10^12 / (2 × 10^12) ≈ 0.5 or 50%
```

For 1 million devices and 50 bits:
```
P ≈ 10^12 / (2 × 10^15) ≈ 0.0005 or 0.05%
```

## Generic Entropy Support

While 256-bit Ed25519 keys are the common case, this crate supports arbitrary entropy lengths:

```rust
// 256 bits (Ed25519 public key) - optimized, fast path
let identity = EmojiIdentity::from_256_bits(pubkey);

// Arbitrary length - generic implementation
let identity = EmojiIdentity::from_entropy(&my_512_bit_key);
```

The 256-bit path uses:
- 1 choice emoji (10 bits parameters)
- 25 entropy emojis (250 bits, 4 bits unused)

For longer keys, we simply add more emojis. For shorter keys, we truncate the emoji count.

## The Patterns

The choice emoji determines the pattern:

- **O-O-F**: Observe, observe, react. The patient witness. Default.
- **O-F-F**: Observe, react, react. The rich responder.
- **O-F-O-F**: Alternating attention and emotion. The rhythmic poet.
- **F-O-O**: Lead with presence. The social butterfly.

## The Collaboration Sigil: 🌲😀🍕📡

This specific emoji string emerged during a session between mnzaki and Kimi in February 2026. It doesn't follow any standard pattern—it's **O-F-O-O**:

| Position | Emoji | Category | Meaning in Context |
|----------|-------|----------|-------------------|
| 0 | 🌲 | Nature/Starter | The choice emoji; growth, roots, beginning |
| 1 | 😀 | Face | First reaction: joy, presence, human element |
| 2 | 🍕 | Food | Second observation: sustenance, culture, shared meal |
| 3 | 📡 | Object | Communication: broadcast, signal, reaching outward |

**The reading**: *"From rooted growth, comes human joy; through shared sustenance, we broadcast outward."*

This sigil encodes:
- A non-standard pattern (O-F-O-O)
- A collaboration moment
- The solarpunk ethos: nature → human → community → communication

## Emoji Sets

We curate emoji by category for visual distinctiveness:

- **Starters** (~50): Distinctive opening emojis for choice position
- **Faces** (~100): Human emotional reactions
- **Nature** (~100): Plants, weather, geography
- **Food** (~100): Sustenance and culture
- **Animals** (~100): Non-human life
- **Objects** (~100): Tools, technology, communication
- **Symbols** (~100): Abstract, religious, zodiac (optional)

## Usage

```rust
use emoji_from_entropy::EmojiIdentity;

// Generate from 256-bit public key (optimized path)
let pubkey = [42u8; 32]; // Your Ed25519 public key
let identity = EmojiIdentity::from_256_bits(pubkey);

println!("Full identity: {}", identity);     // ~26 emojis
println!("Short form: {}", identity.short(5)); // First 5 emojis

// Build a PKB URL
let url = format!("pkb://{}/notes/diary/2024/My Day.js.md", 
                  identity.short(5));

// Generic entropy (any length)
let entropy = vec![0u8; 64]; // 512 bits
let identity = EmojiIdentity::from_entropy(&entropy);
```

## The Philosophy

> "The key determines its own reading."

The choice emoji's parameters aren't selected—they're **derived from entropy**. Yet they become **meaningful** through use. The O-F-F vs O-O-F pattern isn't right or wrong. It's **variance encoded**.

The short form (N=4 or N=5) trades collision resistance for memorability. This is appropriate for:
- Personal device recognition
- Casual sharing
- UI display

For cryptographic verification, always use the full entropy.

## Future: Y2, Y3, Y4

When PKI arrives (Y2), these identities become addresses. When content hashing is native (Y3), the URLs resolve to content. When p2p is default (Y4), the emoji strings are how humans recognize devices in a mesh.

The format is ready. The math is sound. The meaning will grow.

---

*"Even entropy has a face if you look at it right."* 🌲😀🍕📡
