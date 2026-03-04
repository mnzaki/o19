# How to Loom 🧶

> *"The warp is your intention; the loom makes it real."*

**⚠️ YOU HAVE A `loom/WARP.ts`. This is not a suggestion. This is your fate should you choose to spire-loom.** 🌀

Every spire-loom project begins with a `loom/WARP.ts` at workspace root. Its presence signals calling in all `loom/*` files, which typically export Management Imprints (subclasses of `loom.Management`that define the boundary-crossing interface). Workspace packages push their declarations into the WARP by having their own `loom/*` files. When looming, You don't really tell it what will be, rather one intuits in WRAP to the loom's reeds ([./machinery/reed](./machinery/reed)), such that the [heddles](./machinery/heddles) vibrate knowingly (patternmatchingly) when the [treadles](./machinery/treadles) are trodden and the weave is in `{package}/spire/`s woven.

---

## The Thread™

Your `loom/WARP.ts` sits at the center. By virtue of being there `loom/` is special, it's meta. It's the conceptual connections between packages in the monorepo and also internals of these packages in many cases of self-spiraling and `.tieup()`s. Workspace packages push their declarations into the workspace declarations. Everything flows from it:

```
                    ╭───────────────╮
                    │     YOU       │
                    │  loom/WARP.ts │ ← It begins here
                    │ calls loom/*  │
                    ╰──────┬────────╯
                           │
              ╭────────────┼────────────╮
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │  Core   │  │ Platform│  │  Front  │
        │  Rust   │  │ Android │  │ TypeScript
        │         │  │ Desktop │  │   DDD   │
        │         │  │  Tauri  │  │         │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             ╰────────────┼────────────╯
                          │
                    ╭─────┴─────╮
                    │   pnpm    │
                    │ spire-loom│ ← Run this
                    ╰─────┬─────╯
                          │
              ╭───────────┼───────────╮
              │           │           │
              ▼           ▼           ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │ lib.rs │ │service │ │commands│
         │        │ │.kt     │ │.ts     │
         └────────┘ └────────┘ └────────┘
                         │
                         ▼
                    ┌─────────┐
                    │  spire/ │  ← A spire atop your foundations
                    └─────────┘

            "You wrote WARP.ts. The loom read it.
       The Thread™ wove; a spire atop your foundations lain."
```

There are three moments[^1]: **intention** (you write), **architecture** (rings form), **generation** (code emerges).

---

## Intention: Write Your `loom/WARP.ts`

You sit down. You open your editor. You create `loom/WARP.ts`. By its presence, it marks `loom/` special. By virtue of being there did we say this before? Workspace packages push their declarations into the workspace declarations. This is not configuration. You do not declare what shall be—you intuit in WRAP to the loom's reeds, such that the heddles vibrate knowingly (patternmatchingly) when the treadles are [trodden](#the_thread™)

### The Struct

```typescript
// loom/WARP.ts - Your intention made manifest
import loom from '@o19/spire-loom';

// Core: Your domain structs (Rust, because you chose Rust)
// AlmostDid tracks everything you almost did—books almost read,
// calls almost made, dreams almost pursued. Utterly useless.
// Like a digital stray that follows you home and does nothing
// but stare at you with big sad eyes. Your granny can't delete it.
@loom.rust.Struct
export class AlmostDid {
  @loom.rust.Mutex @loom.rust.Option
  regret_engine = RegretEngine;

  @loom.rust.Mutex @loom.rust.Option
  guilt_accumulator = GuiltAccumulator;

  @loom.rust.Mutex @loom.rust.Option
  void_stare = VoidStare;
}

// Spiral out: Core → Platform → Interface → Front
export const almostDid = loom.spiral(AlmostDid);
export const android = almostDid.android.foregroundService({ 
  nameAffix: 'ghostkeeper',
  notificationChannel: 'guilt-reminders',
  persistentNotification: true,
  wakeLock: true
});
export const desktop = almostDid.desktop.direct({
  autoStart: true,
  minimizeToTray: true,
  trayIcon: 'sad-eyes.png'
});
export const tauri = loom.spiral(android, desktop).tauri.plugin({
  pluginName: 'almost-did',
  allowlist: ['fs:read', 'notification:send', 'window:minimize']
});
export const front = tauri.typescript.ddd({
  entityNames: ['Almost', 'Regret', 'Ghost'],
  aggregateRoots: ['AlmostAggregate'],
  repositoryPattern: true
});
```

You save the file. You have declared. The Thread™ now has your intention.

### The Management (Imprints)

Operations need declaring too. Not implementation—just the imprint:

```typescript
// loom/regret.ts - Operations, not implementations
// Tracks the infinite chasm between intention and action
import loom, { crud } from '@o19/spire-loom';
import { almostDid } from './WARP.js';

@loom.reach('Global')
@loom.link(almostDid.inner.core.regret_engine)
class RegretMgmt extends loom.Management {
  @loom.crud.create
  recordAlmostDid(
    what: string,
    howClose: number,  // 0.0 to 1.0, usually 0.99
    excuses: string[],
    timestamp: Date
  ): void { throw new Error('Imprint only'); }

  @loom.crud.read
  getRegret(id: number): Regret {
    throw new Error('Imprint only');
  }

  @loom.crud.read({ by: 'what' })
  getRegretByWhat(what: string): Regret {
    throw new Error('Imprint only');
  }

  @loom.crud.list({ collection: true })
  listRegrets(
    limit?: number,
    offset?: number,
    filter?: 'all' | 'abandoned' | 'haunting' | 'forgotten'
  ): Regret[] { throw new Error('Imprint only'); }

  @loom.crud.update
  reviseExcuses(
    regretId: number,
    newExcuses: string[],
    isPlausible: boolean
  ): boolean { throw new Error('Imprint only'); }

  @loom.crud.delete_({ soft: true })
  attemptToForget(regretId: number): boolean { 
    // Returns false. You cannot forget. The app remembers.
    throw new Error('Imprint only'); 
  }
}

// Associate entities
@RegretMgmt.Entity()
export class Regret {
  id = crud.field.id();
  what = crud.field.string();
  intendedDate = crud.field.int();  // timestamp_ms
  actualDate = crud.field.int({ nullable: true });  // Always null. That's the point.
  excuses = crud.field.json<string[]>();
  guiltLevel = crud.field.string();  // 'mild' | 'moderate' | 'existential' | 'absurdist'
  hauntingFrequency = crud.field.string();  // 'daily' | 'weekly' | 'hourly' | 'constant'
  voidStareDuration = crud.field.int();  // milliseconds spent staring into void
  createdAt = crud.field.createdAt();
}

// loom/guilt.ts - The guilt accumulator
import loom, { crud } from '@o19/spire-loom';
import { almostDid } from './WARP.js';

@loom.reach('Application')
@loom.link(almostDid.inner.core.guilt_accumulator)
class GuiltMgmt extends loom.Management {
  @loom.crud.create
  accumulateGuilt(
    source: string,
    weight: number,  // arbitrary unit, usually 42
    isRational: boolean  // always false
  ): void { throw new Error('Imprint only'); }

  @loom.crud.read
  getGuiltEntry(id: number): GuiltEntry {
    throw new Error('Imprint only');
  }

  @loom.crud.list({ collection: true })
  listGuiltEntries(limit?: number, offset?: number): GuiltEntry[] {
    throw new Error('Imprint only');
  }

  @loom.crud.update
  adjustGuilt(
    id: number,
    amount: number,
    justification: string  // won't help
  ): boolean { throw new Error('Imprint only'); }

  @loom.crud.delete_({ soft: true })
  attemptToAbsolve(id: number): boolean {
    // You cannot absolve guilt. The app remembers.
    throw new Error('Imprint only');
  }
}

@GuiltMgmt.Entity()
export class GuiltEntry {
  id = crud.field.id();
  source = crud.field.string();
  weight = crud.field.int();
  timestamp = crud.field.int();  // timestamp_ms
  isRational = crud.field.boolean();
  grandmaWouldSay = crud.field.string();
  createdAt = crud.field.createdAt();
  updatedAt = crud.field.updatedAt();
}

// loom/void.ts - The void stares back
import loom, { crud } from '@o19/spire-loom';
import { almostDid } from './WARP.js';

@loom.reach('Global')
@loom.link(almostDid.inner.core.void_stare)
class VoidStareMgmt extends loom.Management {
  @loom.crud.create
  initiateStare(duration: number): void { 
    // Opens empty screen. User stares. Time passes.
    // Nothing happens. This is the feature.
    throw new Error('Imprint only'); 
  }

  @loom.crud.read
  getStareSession(id: number): StareSession {
    throw new Error('Imprint only');
  }

  @loom.crud.list({ collection: true })
  listStareSessions(limit?: number, offset?: number): StareSession[] {
    throw new Error('Imprint only');
  }

  @loom.crud.update
  recordEpiphany(id: number, epiphany: string): boolean {
    // Epiphanies are lost to the void
    throw new Error('Imprint only');
  }
}

@VoidStareMgmt.Entity()
export class StareSession {
  id = crud.field.id();
  startTime = crud.field.int();  // timestamp_ms
  endTime = crud.field.int({ nullable: true });
  duration = crud.field.int();  // milliseconds
  thoughtsHad = crud.field.json<string[]>();  // always empty
  voidQuality = crud.field.int();  // always perfect (10)
  createdAt = crud.field.createdAt();
}
```

The loom reads these. It knows what you want. When the treadles are trodden 👣, it will generate the rest.

### Run

```bash
pnpm spire-loom
# Generated code goes to each package's spire/ directory
# Including: spire/lib.rs, spire/service.kt, spire/commands.ts
# The app does nothing useful but your granny keeps it installed
```

You run this command. The Thread™ moves from intention to architecture to generation. Treadles are trodden 👣, heddles lift, the shuttle flies. Code appears in `spire/` directories. Your WARP.ts has been woven.

---

## Architecture: Rings Connect

Once you have declared, structure emerges. Rings wrap rings. This is the 'warp' phase—static, architectural, connecting.

### Connection Patterns

```typescript
// Pattern 1: Simple wrapping
const android = almostDid.android.foregroundService({
  nameAffix: 'ghostkeeper',
  notificationChannel: 'guilt-reminders',
  persistentNotification: true,
  wakeLock: true,
  foregroundServiceType: 'dataSync'
});
// Creates: AndroidSpiraler → almostDid

// Pattern 2: Multi-platform aggregation (Tauri)
const tauri = loom.spiral(android, desktop).tauri.plugin({
  pluginName: 'almost-did',
  allowlist: [
    'fs:read', 
    'notification:send', 
    'window:minimize',
    'window:show',
    'process:relaunch'
  ],
  pluginConfig: {
    guiltInterval: 3600,  // seconds
    voidStareEnabled: true,
    grandmaMode: true  // extra gentle, extra sad
  }
});
// Creates: TauriSpiraler → [android, desktop]

// Pattern 3: Direct TypeScript front
const front = tauri.typescript.ddd({
  entityNames: ['Almost', 'Regret', 'Ghost', 'Guilt', 'Void'],
  aggregateRoots: ['AlmostAggregate', 'GuiltAggregate'],
  repositoryPattern: true,
  serviceLayer: true,
  commandHandlers: true,
  queryHandlers: true
});
// Creates: TsCore → tauri

// Pattern 4: Tieup treadles (custom generators)
import { declareTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const accumulateGuilt = declareTreadle({
  name: 'accumulate-guilt',
  matches: [{ current: 'TsCore', previous: 'TauriSpiraler' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'guilt/registry.ts.ejs', path: 'src/guilt/registry.ts', language: 'typescript' },
    { template: 'guilt/ledger.ts.ejs', path: 'src/guilt/ledger.ts', language: 'typescript' }
  ],
  data: (ctx) => ({
    guiltLevels: ctx.config.guiltLevels,
    voidStareThemes: ctx.config.voidStareThemes,
    excuses: ctx.config.excuses
  })
});

const front = tauri.typescript.ddd({
  entityNames: ['Almost', 'Regret'],
  aggregateRoots: ['AlmostAggregate']
}).tieup({
  treadles: [{
    treadle: accumulateGuilt,
    warpData: {
      guiltLevels: ['mild', 'moderate', 'existential', 'absurdist'],
      voidStareThemes: ['midnight', 'abyss', 'grandma-disappointed'],
      excuses: ['too busy', 'forgot', 'was scared', 'next time for sure']
    }
  }]
});
```

You can reach inward: `almostDid.inner.core.regret_engine`. The architecture is a graph. You navigate it.

### Package WARP Overrides 🌀

Your packages can have their own WARP.ts. The loom discovers them:

```typescript
// workspace/loom/WARP.ts - Main architecture
// import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const weaveFoundation = declareTreadle({
  name: 'weave-foundation',
  matches: [{ current: 'SpiralRing', previous: 'CoreRing' }],
  methods: { filter: 'core', pipeline: [] },
  outputs: [
    { template: 'foundation/prelude.rs.ejs', path: 'src/lib.rs', language: 'rust' }
  ],
  hookups: [
    { path: 'Cargo.toml', dependencies: { serde: '^1.0', chrono: '^0.4' } }
  ]
});

export const front = loom.spiral()
  .tieup({ 
    treadles: [{
      treadle: weaveFoundation,
      warpData: {
        guiltAccumulationRate: 1.0,
        voidStareDefaultDuration: 5000,
        grandmaQuotes: ['Bless your heart', 'You tried', 'Maybe tomorrow']
      }
    }] 
  });  // Runs first

// workspace/packages/almostdid-mobile/loom/WARP.ts - Package override
// import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const hauntLockScreen = declareTreadle({
  name: 'haunt-lock-screen',
  matches: [{ current: 'AndroidSpiraler', previous: 'RustCore' }],
  methods: { filter: 'platform', pipeline: [] },
  outputs: [
    { template: 'android/notification.kt.ejs', path: 'src/notification.kt', language: 'kotlin' },
    { template: 'android/service.kt.ejs', path: 'src/service.kt', language: 'kotlin' }
  ],
  hookups: [
    { path: 'AndroidManifest.xml', permissions: ['POST_NOTIFICATIONS', 'FOREGROUND_SERVICE'] }
  ]
});

export const front = loom.spiral.typescript.ddd({
  entityNames: ['Almost', 'Regret', 'MobileGuilt'],
  aggregateRoots: ['AlmostAggregate']
}).tieup({ 
  treadles: [{
    treadle: hauntLockScreen,
    warpData: {
      mobileNotifications: true,
      lockScreenGuilt: true,
      vibrationPattern: 'sad-long'
    }
  }] 
});  // Runs second

// Result: Both treadles execute; package ring replaces main ring
```

#### Override Patterns

```typescript
// Override 1: Custom structure
// import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const stareIntoVoid = declareTreadle({
  name: 'stare-into-void',
  matches: [{ current: 'TsCore', previous: 'TauriSpiraler' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'void/void.yaml.ejs', path: 'config/void.yaml', language: 'yaml' },
    { template: 'void/component.ts.ejs', path: 'src/void/component.ts', language: 'typescript' }
  ],
  hookups: [
    { path: 'src/main.ts', imports: ['import { voidConfig } from "./config/void";'] }
  ]
});

export const front = loom.spiral(loom.tsCore(), {
  packagePath: 'packages/almostdid-void',
  language: 'typescript',
  outputDir: 'src/spire'
}).tieup({ 
  treadles: [{
    treadle: stareIntoVoid,
    warpData: {
      voidTypes: ['existential', 'bureaucratic', 'grandma-sad'],
      stareSounds: ['silence.mp3', 'distant-wind.mp3', 'sigh.mp3']
    }
  }] 
});

// Override 2: Additional tieups
// import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const dispenseGrandmaWisdom = declareTreadle({
  name: 'dispense-grandma-wisdom',
  matches: [{ current: 'TsCore', previous: 'TauriSpiraler' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'wisdom/quotes.json.ejs', path: 'assets/quotes.json', language: 'json' },
    { template: 'wisdom/service.ts.ejs', path: 'src/wisdom/service.ts', language: 'typescript' }
  ],
  data: (ctx) => ({ quoteCount: ctx.config.quoteCount })
});

export const front = tauri.typescript.ddd({
  entityNames: ['Almost', 'Regret'],
  aggregateRoots: ['AlmostAggregate']
}).tieup({ 
  treadles: [
    { treadle: accumulateGuilt, warpData: { maxGuilt: 9000 } },
    { treadle: stareIntoVoid, warpData: { stareDuration: 10000 } },
    { treadle: dispenseGrandmaWisdom, warpData: { quoteCount: 47 } }
  ] 
});

// Override 3: Different generators entirely
// import { defineTreadle } from '@o19/spire-loom/machinery/treadle-kit';

const embraceAbsurdity = declareTreadle({
  name: 'embrace-absurdity',
  matches: [{ current: 'SpiralRing', previous: 'CoreRing' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'absurd/ui.vue.ejs', path: 'src/components/AbsurdUi.vue', language: 'vue' },
    { template: 'absurd/store.ts.ejs', path: 'src/store/absurd.ts', language: 'typescript' }
  ],
  data: (ctx) => ({ kafkaFactor: ctx.config.kafkaFactor })
});

const weighTheSoul = declareTreadle({
  name: 'weigh-the-soul',
  matches: [{ current: 'SpiralRing', previous: 'CoreRing' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'soul/visualization.svg.ejs', path: 'assets/soul.svg', language: 'svg' },
    { template: 'soul/meter.ts.ejs', path: 'src/soul/meter.ts', language: 'typescript' }
  ],
  data: (ctx) => ({ color: ctx.config.color })
});

const amplifySilence = declareTreadle({
  name: 'amplify-silence',
  matches: [{ current: 'SpiralRing', previous: 'CoreRing' }],
  methods: { filter: 'front', pipeline: [] },
  outputs: [
    { template: 'silence/player.ts.ejs', path: 'src/audio/player.ts', language: 'typescript' },
    { template: 'silence/manifest.json.ejs', path: 'assets/manifest.json', language: 'json' }
  ],
  data: (ctx) => ({ ambientTracks: ctx.config.ambientTracks })
});

export const front = loom.spiral(myCustomCore(), {
  packagePath: 'packages/almostdid-experimental',
  language: 'typescript'
}).tieup({
  treadles: [
    { treadle: embraceAbsurdity, warpData: { kafkaFactor: 0.99 } },
    { treadle: weighTheSoul, warpData: { color: '#8B4513' } },
    { treadle: amplifySilence, warpData: { ambientTracks: ['void1.mp3', 'void2.mp3'] } }
  ]
});
```

#### Resolution Order

1. **Main WARP.ts** loads → rings created, lazy tieups stored
2. **Metadata computed** → `packagePath` determined from export name
3. **Package WARP.ts** auto-loaded → `{packagePath}/loom/WARP.ts` (if exists)
4. **Tieups merged** → main tieups + package tieups (concatenated)
5. **Final ring used** → package ring replaces main ring for that export

> **🌀 Rule:** Package WARPs are always loaded when present. No opt-in. Tieups concatenate; ring replaces.

#### Debugging

```bash
DEBUG_PACKAGE_WARP=1 pnpm spire-loom
# Output: "🌀 Package WARP: front from packages/almostdid-mobile/loom/WARP.ts"
# Your grandma sees this and says "Bless its heart, it found the package"
```

---

## Generation: Write Treadles

The architecture stands. Now motion—👣 treadles execute. This is the 'weave' phase. Your WARP.ts declared the structure; now treadles are **trodden** and code flows forth.

### Basic Treadle

A developer named Alex once spent three days writing boilerplate. Then Alex discovered treadles 👣—foot pedals of the loom that lift the heddles when stepped upon. Alex now writes one treadle and generates everything. Alex is happier. You can be Alex.

```typescript
// loom/treadles/guilt-registry.ts
import { declareTreadle, generateFromTreadle } from '@o19/spire-loom/machinery/treadle-kit';

export const weaveGuiltRegistry = declareTreadle({
  name: 'weave-guilt-registry',

  // Match: when this edge appears in WARP.ts, this treadle is trodden 👣
  matches: [{ current: 'TauriSpiraler.plugin', previous: 'RustCore' }],

  // Method collection
  methods: {
    filter: 'platform',  // 'core' | 'platform' | 'front'
    pipeline: [addManagementPrefix()]
  },

  // Language enhancement (optional - auto-detected from template filenames)
  // First language is default for method.functionName, method.returnType, etc.
  language: ['rust', 'typescript', 'kotlin'],
  
  // Generate files (language auto-detected from .rs.ejs, .ts.ejs, .kt.ejs)
  outputs: [
    { template: 'guilt/registry.ts.ejs', path: 'src/guilt/registry.ts' },
    { template: 'guilt/accumulator.rs.ejs', path: 'src/guilt/accumulator.rs' },
    { template: 'guilt/broadcast.kt.ejs', path: 'src/guilt/broadcast.kt' }
  ],

  // Hookups: modify existing files
  hookups: [
    { 
      path: 'Cargo.toml', 
      dependencies: { 
        serde: '^1.0',
        chrono: '^0.4',
        'guilt-engine': { version: '^0.1.0', optional: true }
      } 
    },
    {
      path: 'src/db-router.ts',
      classes: {
        DbRouter: {
          methods: { 
            init: { 
              prepend: [
                'this.guiltInitialized = true;',
                'this.voidStareReady = false;'
              ] 
            }
          }
        }
      }
    },
    {
      path: 'src/handler.rs',
      impls: {
        'GuiltHandler': {
          methods: { 
            'new': { 
              prepend: [
                '// Initialize guilt accumulator',
                'self.guilt_level = 0.0;'
              ] 
            }
          }
        }
      }
    }
  ]
});

// The treadle waits, foot poised above the pedal 👣
// When woven, it will lift its heddles and the pattern emerges
export default generateFromTreadle(weaveGuiltRegistry);
```

> **🌀 Rule:** Hookup configs accept arrays of lines OR arrays of objects:
> ```typescript
> hookups: [{ exports: ["export * from './guilt';", "export * from './regret';"] }]
> // OR
> hookups: [{ exports: [{ source: './guilt', star: true }, { source: './regret', star: true }] }]
> ```

### Dynamic Outputs

Generate one file per entity:

```typescript
outputs: [(ctx) => {
  const config = ctx.config as { 
    guiltLevels: string[];
    voidStareThemes: string[];
    excuses: string[];
  };

  // Generate a guilt component for each level
  return config.guiltLevels.map(level => ({
    template: 'guilt/ledger.ts.ejs',
    path: `src/guilt/components/${level}.ts`,
    language: 'typescript',
    context: {
      level: { 
        name: level, 
        pascal: toPascal(level),
        color: getGuiltColor(level),
        grandmaQuote: getRandomGrandmaQuote()
      }
    }
  }));
}]
```

### Method Queries

Query your managements:

```typescript
data: (ctx) => {
  // Classic API
  const creates = ctx.methods?.creates;
  const entities = ctx.entities?.withFields();

  // Query API - chainable
  const guiltCreates = ctx.query?.methods
    .crud('create')
    .tag('guilt:accumulating')
    .management('GuiltMgmt')
    .all;

  const regretReads = ctx.query?.reads
    .management('RegretMgmt')
    .all;

  const hauntingRegrets = ctx.query?.methods
    .tag('haunting:yes')
    .byManagement();

  return { 
    guiltCreates, 
    regretReads, 
    hauntingRegrets,
    entities,
    totalGuilt: calculateTotalGuilt(guiltCreates)
  };
}
```

### Tieup Style (Direct Invocation)

No matches needed—invoke directly from WARP.ts:

```typescript
// In WARP.ts
export const front = tauri.typescript.ddd({
  entityNames: ['Almost', 'Regret', 'Guilt'],
  aggregateRoots: ['AlmostAggregate']
}).tieup({
  treadles: [{
    treadle: accumulateGuilt,
    warpData: {
      guiltLevels: ['mild', 'moderate', 'existential', 'absurdist'],
      voidStareThemes: ['midnight', 'abyss', 'grandma-disappointed'],
      excuses: [
        'too busy',
        'forgot', 
        'was scared',
        'next time for sure',
        'the stars were not aligned',
        'my cat looked sad'
      ],
      grandmaQuotes: [
        'Bless your heart',
        'You tried',
        'Maybe tomorrow',
        'The void accepts all'
      ]
    }
  }]
});

// In treadle
defineTreadle({
  name: 'guilt-dashboard',
  methods: { filter: 'front', pipeline: [] },
  data: (ctx) => {
    const config = ctx.config as { 
      guiltLevels: string[];
      grandmaQuotes: string[];
    };
    return { 
      levels: config.guiltLevels,
      quotes: config.grandmaQuotes,
      totalAccumulated: 0  // starts at 0, only goes up
    };
  },
  outputs: (ctx) => ctx.entities?.all.map(e => ({
    template: 'schema.ts.ejs',
    path: `entities/${e.name.toLowerCase()}-guilt.ts`,
    context: { 
      entity: e,
      guiltColor: '#8B4513',
      voidEmoji: '🕳️'
    }
  })) || []
});
```

---

## Tools Reference

Utilities for treadle authors.

### Stringing

```typescript
import {
  pascalCase,      // 'my-service' → 'MyService'
  camelCase,       // 'my_service' → 'myService'
  toSnakeCase,     // 'MyService' → 'my_service'
  buildServiceNaming,
  mapToAidlType,
  addAidlTypesToMethods
} from '@o19/spire-loom/machinery/stringing';

const naming = buildServiceNaming('almostdid', 'ghostkeeper');
// → { 
//   serviceName: 'AlmostdidGhostkeeperService', 
//   interfaceName: 'IAlmostdidGhostkeeper',
//   binderName: 'AlmostdidGhostkeeperBinder',
//   aidlName: 'IAlmostdidGhostkeeper.aidl'
// }
```

### Sley (Method Pipeline)

```typescript
import {
  addManagementPrefix,     // regret_recordAlmostDid → regret_record_almost_did
  crudInterfaceMapping,
  mapTypes,
  tagFilter,
  crudOperationFilter,
  groupByManagement,
  groupByCrud,
  MethodPipeline
} from '@o19/spire-loom/machinery/sley';

const pipeline = new MethodPipeline()
  .translate(addManagementPrefix())
  .translate(crudInterfaceMapping())
  .filter(tagFilter('guilt:accumulating'))
  .transform(mapTypes({
    'GuiltLevel': 'i32',
    'Regret': 'RegretEntry'
  }));

const methods = pipeline.process(rawMethods);
```

### Treadle Kit

```typescript
import {
  defineTreadle,
  generateFromTreadle,
  toRawMethod,
  buildContextMethods,
  buildAndroidPackageData,
  buildTauriPluginNaming,
  createTreadleKit
} from '@o19/spire-loom/machinery/treadle-kit';

// Create a kit for guilt-related treadles
const guiltKit = createTreadleKit({
  prefix: 'guilt',
  defaultTemplateDir: 'loom/bobbin/guilt',
  defaultWarpData: {
    guiltLevels: ['mild', 'moderate', 'existential', 'absurdist'],
    grandmaMode: true
  }
});
```

### Query Builder

```typescript
import { createQueryAPI } from '@o19/spire-loom/machinery/sley';

ctx.query?.methods
  .crud('create', 'update')
  .tag('guilt:accumulating', 'haunting:yes')
  .byManagement();

ctx.entities?.byManagement().get('RegretMgmt');
ctx.entities?.readOnly;
ctx.entities?.withFields(['id', 'what', 'guiltLevel']);
```

---

## Templates

EJS templates. Override builtins in `loom/bobbin/`:

```
loom/bobbin/
  guilt/
    registry.ts.ejs     ← Custom guilt registry/store
  regret/
    catalog.ts.ejs      ← Regret catalog/index
  void/
    void.yaml.ejs       ← The void configuration
  tauri/
    manifest.json.ejs   ← Override
```

Lookup: `loom/bobbin/` → `machinery/bobbin/`

### Template Data

Templates receive data with **language-enhanced methods**:

```ejs
export class <%= entity.pascal %>GuiltService {
  <% methods.forEach(m => { -%>
  // m.functionName uses language convention automatically
  // TypeScript template → camelCase, Rust template → snake_case
  async <%= m.functionName %>(): Promise<<%= m.returnType %>> {
    // m.returnType is language-specific: "Bookmark[]" for TS, "Vec<Bookmark>" for Rust
    // Grandma would say: "<%= m.grandmaQuote || 'Bless your heart' %>"
    <%= m.stubReturn %>
  }
  <% }) -%>
}

<% methods.forEach(m => { -%>
  <% if (m.link?.fieldName === 'regret_engine') { -%>
    // Route to RegretEngine for guilt processing
    // This will definitely make you feel worse
  <% } -%>
<% }) -%>
```

**Language Detection:** Language is auto-detected from template filename:
- `commands.rs.ejs` → Rust enhancement
- `service.kt.ejs` → Kotlin enhancement  
- `api.ts.ejs` → TypeScript enhancement

### Enhanced Methods

Templates receive **EnhancedMethod** objects with language views and variant accessors:

```ejs
<% methods.forEach(m => { -%>
  // Base method uses template's language convention automatically
  // commands.rs.ejs → snake_case, api.ts.ejs → camelCase
  fn <%= m.functionName %>() -> <%= m.returnType %> {
    <%= m.stubReturn %>
  }
  
  // Variant accessors for function modifiers (max 3 levels)
  // <%= m.async.signature %> → "async fn foo()"
  // <%= m.pub.async.signature %> → "pub async fn foo()"
  // <%= m.public.static.signature %> → "public static foo()"
<% }) -%>
```

**Key Properties:**
| Property | Example | Description |
|----------|---------|-------------|
| `m.functionName` | `add_bookmark` / `addBookmark` | Idiomatic function name |
| `m.typeName` | `AddBookmark` | PascalCase type name |
| `m.returnType` | `Vec<Bookmark>` / `Bookmark[]` | Language-specific return type |
| `m.stubReturn` | `Vec::new()` / `[]` | Default return for mocks |
| `m.signature` | `fn add_bookmark()` | Full function signature |
| `m.params.list` | `id: i64, name: String` | Parameter list with types |
| `m.params.names` | `id, name` | Parameter names only |
| `m.hasTag('rust:result')` | `true` / `false` | Check method tags |
| `m.crudOperation` | `'create'` / `'read'` | CRUD operation type |

**Variant Accessors (chainable):**
```ejs
// Base: <%= m.signature %>
// Async: <%= m.async.signature %>
// Public: <%= m.pub.signature %>
// Public Async: <%= m.pub.async.signature %>
// Available: async, pub, public, private, protected, static, unsafe, const
```

**Cross-Language Access:**
```ejs
// In Rust template, access TypeScript representation:
<%= m.ts.functionName %>     // "addBookmark"
<%= m.ts.returnType %>       // "Bookmark[]"
<%= m.kt.functionName %>     // "addBookmark"
<%= m.rs.functionName %>     // "add_bookmark"
```

### Enhanced Entities

Templates receive **EnhancedEntity** objects with field views:

```ejs
<% entities.forEach(e => { -%>
  // Entity uses template's language convention
  pub struct <%= e.typeName %> {
    <% e.fields.forEach(f => { -%>
    pub <%= f.name %>: <%= f.type %>,
    <% }) -%>
  }
  
  // Table name (snake_case plural)
  // <%= e.tableName %> → "regret_entries"
<% }) -%>
```

**Key Properties:**
| Property | Example | Description |
|----------|---------|-------------|
| `e.typeName` | `RegretEntry` | PascalCase struct/class name |
| `e.tableName` | `regret_entries` | snake_case plural table name |
| `e.variableName` | `regretEntry` | camelCase variable name |
| `e.fields` | Array | All fields with language types |
| `e.primaryField` | Field | Primary key field |
| `e.insertFields` | Array | Fields for INSERT (excludes auto-generated) |
| `e.updateFields` | Array | Fields for UPDATE (excludes PK, auto-generated) |
| `e.structDefinition` | String | Complete struct/class definition |
| `e.tableDefinition` | String | SQL CREATE TABLE statement |

**Field Properties:**
```ejs
<% entity.fields.forEach(f => { -%>
  <%= f.name %>           // Field name
  <%= f.type %>           // Language-specific type
  <%= f.tsType %>         // TypeScript type
  <%= f.sqlType %>        // SQL type (TEXT, INTEGER, etc.)
  <%= f.columnName %>     // snake_case column name
  <%= f.nullable %>       // Boolean
  <%= f.isPrimary %>      // Boolean
<% }) -%>
```

**Cross-Language Access:**
```ejs
<%= entity.ts.typeName %>     // "RegretEntry"
<%= entity.rs.typeName %>     // "RegretEntry"
<%= entity.kt.typeName %>     // "RegretEntry"
```

**Full API Reference:** See [TEMPLATE_API.md](./TEMPLATE_API.md)

---

## Hookups

Modify existing files:

```typescript
hookups: [
  {
    path: '{packageDir}/src/router.ts',
    imports: [
      'import { guiltHandler } from "./guilt/generated";',
      'import { regretRouter } from "./regret/routes";',
      'import { voidStare } from "./void/stare";'
    ],
    classes: {
      Router: {
        fields: [
          'private guiltLevel = 0;',
          'private grandmaMode = true;',
          'private voidStareActive = false;'
        ],
        methods: {
          init: { 
            prepend: [
              'this.guiltLevel = calculateInitialGuilt();',
              'this.grandmaMode = checkGrandmaSettings();'
            ] 
          },
          destroy: { 
            append: [
              'cleanupGuilt();',
              'console.log("Grandma would be disappointed");'
            ] 
          }
        },
        newMethods: [
          'accumulateGuilt(amount: number) { this.guiltLevel += amount; }',
          'getGrandmaQuote() { return "Bless your heart"; }'
        ]
      }
    }
  },
  {
    path: '{packageDir}/src/lib.rs',
    impls: {
      'GuiltService': {
        methods: { 
          'new': { 
            prepend: [
              '// Initialize guilt accumulator',
              'self.guilt_level = 0.0;',
              'self.grandma_quotes = vec!["Bless your heart", "You tried"];'
            ] 
          }
        }
      }
    },
    functions: {
      'main': { 
        append: [
          'println!("AlmostDid initialized");',
          'println!("Your regrets are safe with us");'
        ] 
      }
    }
  },
  {
    path: '{packageDir}/src/db.rs',
    template: 'rust/accumulator.rs.ejs',
    context: { 
      entities: ctx.entities?.all,
      guiltLevels: ['mild', 'moderate', 'existential', 'absurdist'],
      grandmaMode: true
    },
    position: { after: 'use sqlx::' }
  }
]
```

### Patches (Deprecated)

```typescript
// Old (deprecated)
patches: [{ type: 'ensureBlock', targetFile: 'src/lib.rs', ... }]

// New (hookup) - auto-detects language from extension
hookups: [{ 
  path: 'src/lib.rs', 
  template: 'guilt/prelude.rs.ejs',
  context: { guiltEnabled: true }
}]
```

---

## Principles

1. **Your `loom/WARP.ts` is executable** - It builds the spiral graph at runtime
2. **Managements are imprints** - Define interfaces, not implementations
3. **Entities decorate Managements** - `@Mgmt.Entity` links data to operations
4. **The loom generates to `spire/`** - Isolated from hand-written code
5. **Methods flow through the spiral** - Collected, filtered, transformed
6. **Tieup treadles for extensions** - Attach via `.tieup()` with `warpData`
7. **Workspace templates override builtins** - Place in `loom/bobbin/`
8. **Query API for complex filtering** - Chainable: `.crud().tag().management()`
9. **Hookups modify external files** - `patches` deprecated; use declarative hookups

---

*See also: [HOW_TO_META_LOOM.md](HOW_TO_META_LOOM.md) for The Thread™ revealed • [DEV.md](DEV.md) for development details • [GLOSSARY.md](GLOSSARY.md) for terminology*

> 🌀👣 *"You wrote `loom/WARP.ts`. The loom read it. The treadles were trodden. The Thread™ wove. Your code emerged. This is how you loom."

---

## Footnotes (The History Condensed)

[^1]: The three moments—intention, architecture, generation—map to the three scopes of The Thread™: 'declare' (forever), 'warp' (workspace session), 'weave' (weaving run). See HOW_TO_META_LOOM.md for the full exposition of the self-declaring declarer, the contraction that expands.

[^2]: The spiral contracts before it expands. The self-declarer (machinery/self-declarer.ts) is the contraction—unique in the loom's architecture for being pulled inward rather than pushing outward. It declares itself, then declares languages ('warp' scope) and treadles ('weave' scope).

[^3]: Languages self-register in 'warp' scope via declareLanguage(); treadles self-register in 'weave' scope via declareTreadle(). Both pull from the self-declarer. The pattern: declare in scope, register in consumer, generate in weave.

---

#sixseasonsandamovie #solarpunk42 #solarpunk #TheThread™
