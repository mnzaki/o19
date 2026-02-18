# Device Pairing Flow

> Pair your devices together with a single QR code scan.

## Overview

Foundframe uses an **asymmetric pairing flow** optimized for the common case:
- **Initiator**: Large device (laptop) that generates and displays a QR code
- **Receiver**: Mobile device (phone) that scans and confirms

The flow leverages Radicle's native "follow" mechanism for peer-to-peer device pairing.

## The Flow

```
┌─────────────┐                              ┌─────────────┐
│   LAPTOP    │  1. generate_pairing_qr()    │    PHONE    │
│ (Initiator) │ ─────────────────────────────>│  (Receiver) │
│             │     Shows QR with NodeId      │             │
└─────────────┘                               └─────────────┘
                                              │
                     2. User scans with phone │
                                              ▼
                                       parse_pairing_url()
                                              │
                                              ▼
                                       Shows confirmation:
                                       "Pair with 😀🌲📡🍕
                                        Laptop of mnzaki?"
                                              │
                     3. User taps "Confirm"   │
                                              ▼
                                       confirm_pairing()
                                              │
                                              ▼
                                  Phone → follows Laptop
                                              │
                                              ▼
┌─────────────┐  4. Phone connects to        └─────────────┘
│   LAPTOP    │     Radicle network                │
│             │◄───────────────────────────────────┘
│             │
│  5. Laptop periodically calls:
│     check_followers_and_pair()
│     → sees phone's session
│     → auto-follows back
│
└─────────────┘
       │
       ▼
  PAIRED! Both follow each other
  PKB syncs via Radicle
```

## Why Asymmetric?

Traditional QR pairing requires **both** devices to scan each other:
1. Device A shows QR, Device B scans
2. Device B shows QR, Device A scans
3. Both confirm

This is cumbersome when:
- The initiator is a laptop (hard to scan with)
- The receiver is a phone (easy to scan with)

Our asymmetric flow:
- **Single scan**: Phone scans laptop's QR
- **Auto-follow-back**: Laptop detects phone's connection and follows back
- **Human verification**: Emoji identity lets user confirm correct device

## Emoji Identity

The QR code URL format:
```
o19://😀🌲📡🍕/pair?deviceName=My%20Laptop&nodeId=z6Mkq...
```

The **emoji identity** (😀🌲📡🍕) is:
- **For human recognition only** - helps users verify they're pairing with the right device
- **NOT reversible** - cannot be decoded back to the NodeId
- **Derived from hash** - consistent for the same device, visually distinct for different devices

The actual **NodeId** is in the URL's `nodeId` parameter in base58btc format.

## API Commands

### 1. Generate QR (Initiator)

```rust
// On laptop
let response = generate_pairing_qr("My Laptop").await?;
// response.url: "o19://😀🌲📡🍕/pair?deviceName=My%20Laptop&nodeId=z6Mkq..."
// response.emoji_identity: "😀🌲📡🍕🚀🌈🐱🍦"
// response.node_id_hex: "z6Mkq..."
```

Display the QR code. The emoji identity can be shown alongside for verification.

### 2. Parse QR (Receiver)

```rust
// On phone, after scanning
let data = parse_pairing_url(scanned_url).await?;
// data.emoji_identity: "😀🌲📡🍕🚀🌈🐱🍦"
// data.device_name: "My Laptop"
// data.node_id: "z6Mkq..."
```

Show confirmation dialog with emoji identity:
> "Pair with 😀🌲📡🍕 (My Laptop)?"

### 3. Confirm Pairing (Receiver)

```rust
// User tapped "Confirm"
confirm_pairing(node_id, "My Laptop").await?;
// Phone now follows laptop
```

### 4. Check Followers (Initiator)

```rust
// On laptop, poll every few seconds after showing QR
let new_devices = check_followers_and_pair().await?;
for device in new_devices {
    println!("Auto-paired with: {}", device.alias);
}
```

## Security Considerations

1. **Visual verification**: Users compare emoji identities to prevent man-in-the-middle
2. **Time-limited**: QR codes should expire after ~5 minutes
3. **Proximity-based**: Radicle's peer discovery assumes local network proximity
4. **No passwords**: Device pairing is based on cryptographic identity, not shared secrets

## Future: Bidirectional Options

For cases where both devices can scan (e.g., phone-to-phone):
- We could add a `request_reverse_qr` command
- Receiver shows QR after following
- Initiator scans to complete bidirectional verification

But for the laptop-phone case, asymmetric is the sweet spot. 🌲😀🍕📡
