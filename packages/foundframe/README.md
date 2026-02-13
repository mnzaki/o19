# foundframe

> *foun·da·tion·al frame·work* — the ground upon which we build; the roots that hold the tree; the pattern that repeats across scales.

## foundframe Philosophy

In the architecture of living systems, nothing exists in isolation. The mycelial network beneath the forest floor does not merely transport nutrients—it remembers, connects, transforms. The forest is not a collection of trees but a continuous organism, speaking in chemical whispers across distances we can barely comprehend.

**foundframe** is this mycelium for the digital commons we call o19.

### Solarpunk is Method, not (just) Aesthetic

Like Love.

We begin from the solarpunk conviction: that technology must serve balance, not domination; that power distributed is power preserved; that the tools we build should open possibilities rather than close them. This is not a visual style—though the visuals may come—but a mode of being with technology.

In foundframe, this manifests as:

- **Local-first authorship**: Your experience originates with you, not in some distant server farm
- **Content-addressed memory**: What matters is not where something came from, but what it *is*
- **Temporal sovereignty**: You decide when you experienced something—not the timestamp of its creation, but the moment of your encounter

TheStream™ embodies this last principle. We do not ask "when was this made?" but rather "when did you meet it?" Your memory is not a database record; it is a living, reconfigurable tapestry of encounters.

### Movement With Deliberation

As noted in our [root documentation](../../../README.md), we move not by abandoning what came before but by carrying it forward—transformed, yes, but recognized. The spiral returns, but on a different plane.

foundframe conserves the wisdom of software architecture's best traditions while refusing their excesses:

- **Domain-Driven Design** reminds us that code should speak the language of the problem, not the machine
- **Onion Architecture** teaches that dependencies must point inward, toward meaning, not outward toward infrastructure
- **Ports and Adapters** (our "foundframe-drizzle" companion) ensure that *how* we store never contaminates *what* we mean

Each of these patterns, understood deeply, is an expression of the same truth: **the center must hold**. The domain—your experience, your content, your relationships—must remain pure, surrounded by concentric layers of implementation detail that can be replaced, upgraded, or reimagined without touching what matters.

## The Architecture of Meaning

### The Center: Your Experience

At the core of foundframe lives TheStream™—not a feed in the corporate sense, not an algorithmic extraction of attention, but a *temporal log of becoming*. 

When you encounter a photograph, a conversation, a fragment of text, it enters your Stream not at the moment of its creation but at the moment of your experience. This is the difference between objective time and subjective memory. TheStream™ honors the latter.

The entities that populate this stream—**Person**, **Post**, **Media**, **Bookmark**, **Conversation**—are not data structures. They are *ontological commitments*. Each represents something you have deemed worthy of remembrance, something that participates in the construction of your digital self.

### The Middle Ring: Ports (The Contracts)

Surrounding the domain, we find the **Ports**—abstract contracts that declare what the domain needs without prescribing how it shall be provided.

A Port says: "The domain requires the ability to remember people, to retrieve them by name or by decentralized identifier, to update their avatars when they change." It does not say: "Use SQLite, use PostgreSQL, use the filesystem."

This is the boundary where foundframe ends and foundframe-drizzle begins. The Port is the promise; the Adapter is the fulfillment.

### The Outer Ring: Services (The Orchestration)

Domain Services sit between the pure entities and the concrete adaptors. They are the conductors, ensuring that when you "commit an accumulation" (publish a post), the bits are preserved, the links are recorded, and the Stream is updated—atomically, reliably, with respect for the transaction as a unit of meaning.

Services inherit from Ports, receiving their interface, but they also receive a concrete Port implementation in their constructor. They delegate persistence downward while adding business logic: validation, orchestration, the subtle transformations that turn user intent into domain reality.

## The Bigger Picture: o19 and Circulari.ty

foundframe is Year One infrastructure for [Circulari.ty](../../../CIRCULARI.TY.md), which itself spins toward [Spirali.ty](../../../README.md#spirality).

In the four-year SWiVeL plan—DearDiary, Hal-loW, Circulari.ty, and their eventual convergence—foundframe provides the gravitational center. Each application that builds upon it speaks the same language of entities, uses the same patterns of persistence, inherits the same commitments to local-first architecture and content-addressed storage.

This is how we avoid the trap of siloed applications, each with its own incompatible data model, each extracting rent from user lock-in. By sharing the foundation, we share the possibility space. An identity created in DearDiary becomes legible to Hal-loW becomes portable to the eventual peer-topeer mesh of Circulari.ty.

The [blag](../../../blag/)—our multimedia garden—grows from this same soil. What you read there, what you watch, what you listen to: all of it can enter your Stream, become part of your accumulated becoming, link backward and forward in the Xanadu-style addressing that foundframe enables.

## The Ethics of Code

We write software as an act of imagination—not just imagining what *is* possible, but what *should* be possible. Every abstraction in foundframe encodes a value:

- **Polymorphic stream entries** say: "Your experience is heterogeneous. A conversation with a friend and a bookmarked article and a photo you took—these are not the same kind of thing, but they can coexist in your memory."

- **UAddress (Universal Address)** says: "Everything is referenceable. Everything can be the source or target of meaning-making."

- **Content hashing** (the TODOs scattered through the code, promises to our future selves) says: "Identity is not username and password. Identity is what you have made, signed, shared."

## Reading On

- The [root README](../../../README.md) situates this in the four-year plan
- [CIRCULARI.TY.md](../../../CIRCULARI.TY.md) sketches the eventual peer-topeer architecture
- The [blag](../../../blag/) offers reflections from the journey
- For the concrete implementation: `foundframe-drizzle` companion package

---

*"In the accumulating becoming, One should not lose sight of oneself when adding to oneself."*

May the CCCB forever self-reconfigure.
