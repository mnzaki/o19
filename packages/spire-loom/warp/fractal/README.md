# The Fractal Warp 🌿

> *"The part contains the whole. The shard remembers the stone."*

The **fractal** is a warp of **self-similar decomposition**—breaking the core into shards while preserving the Management interface that consumers experience.

## The Core Insight

Where [spiral/](../spiral/) wraps the core in platform layers:
```
Core → Platform → Front
(one core, wrapped many times)
```

The **fractal** breaks the core into self-similar pieces:
```
        Core (whole)
           │
           ▼ fractal split
    ┌──────┼──────┐
    ▼      ▼      ▼
 Shard1  Shard2  Shard3  (each a mini-Core)
    │      │      │
    └──────┼──────┘
           ▼
    Consumer sees: Managements (unchanged!)
```

Each **shard** is self-similar to the whole:
- Has the same **Managements**
- Exposes the same **interface**
- But handles only a **subset** of the domain

## The Fractal Pattern

### FractalNode — *The Shard*

```typescript
interface FractalNode {
  /** Unique identity within the fractal */
  readonly id: string;
  
  /** The core logic this shard runs (self-similar!) */
  readonly core: RustCore;
  
  /** Which slice of the domain this shard owns */
  readonly domainSlice: DomainSlice;
  
  /** Get the Management interface (same as whole core!) */
  getManagements(): Management[];  // ← Consumer sees this
  
  /** Route a call to the appropriate shard */
  route<T>(call: ManagementCall<T>): Promise<T>;
}
```

### Domain Slicing — *How to Split*

The fractal must know **how** to break the domain:

```typescript
// By entity ID (consistent hashing)
{ sliceBy: 'entity-id', shardCount: 10 }
// User-12345 → Shard-7 (always)

// By tenant (multi-tenancy)
{ sliceBy: 'tenant', shards: ['acme', 'initech', 'hooli'] }
// Tenant 'acme' → Shard 'acme'

// By geography (edge computing)
{ sliceBy: 'region', shards: ['eu-west', 'us-east', 'ap-south'] }
// Request from Paris → Shard 'eu-west'

// By load (dynamic)
{ sliceBy: 'adaptive', minShards: 3, maxShards: 100 }
// CPU > 70%? Spawn new shard. CPU < 20%? Merge shards.
```

## The Consumer Experience

Here's the magic: **consumers don't know about shards**.

```typescript
// loom/WARP.ts - what the architect writes
export const userService = loom.fractal.split(core, {
  sliceBy: 'user-id',
  shardCount: 16
});

// Consumer code - what developers write
const user = await userService.UserMgmt.getUser({ id: '12345' });
//                              ^^^^^^^^^
//                              Same Management interface!
//                              But request routed to Shard-7 automatically
```

The fractal handles:
- **Routing**: Which shard has user 12345?
- **Migration**: User moves? Transfer state between shards.
- **Rebalancing**: Add shards? Redistribute domain slices.
- **Failure**: Shard dies? Route to replica, recover state.

## Fractal vs Spiral

| | Spiral | Fractal |
|---|---|---|
| **Question** | "What platform wraps the core?" | "How do we split the core?" |
| **Growth direction** | Vertical (layers) | Horizontal (shards) |
| **Pattern** | Rings wrapping rings | Shards mirroring the whole |
| **Complexity** | Platform diversity | Scale/throughput |
| **Consumer sees** | Platform-specific APIs | Same Managements, always |

## When to Use Fractal

### Use Fractal When:
- **Single core can't handle load** (need to partition)
- **Geographic distribution** (users near their data)
- **Multi-tenancy** (isolate tenants at shard level)
- **Fault isolation** (shard failure ≠ system failure)
- **Incremental rollout** (migrate users shard by shard)

### Use Spiral When:
- **Platform diversity** (Android, iOS, Desktop, Web)
- **Compile-time optimization** (monolithic binary)
- **Simple deployment** (one binary per platform)

### Combine Them (Fractal + Spiral):
```typescript
// Each shard is a full spiral-wrapped service
const service = loom.fractal.split(core, {
  shardCount: 10,
  wrapEach: (shard) => loom.spiral(shard)
                     .android.foregroundService()
                     .tauri.plugin()
});

// Result: 10 shards × 3 platforms = 30 generated targets
// But consumer just sees: service.UserMgmt.getUser()
```

## The Generated Architecture

Given:
```typescript
// loom/WARP.ts
export const chat = loom.fractal.split(core, {
  sliceBy: 'room-id',
  shardCount: 8,
  replication: 3
});
```

The loom generates:

```
o19/crates/
├── foundframe-core/              # The core (unchanged)
└── foundframe-fractal/
    └── spire/
        └── src/
            ├── lib.rs            # Fractal runtime
            ├── router.rs         # Consistent hashing router
            ├── shard.rs          # Shard management
            ├── coordinator.rs    # Rebalancing, failover
            └── generated/
                ├── fractal.rs    # FractalNode implementation
                └── management_impls.rs  # Routed Management calls
```

Plus infrastructure:
- **Service discovery** (etcd, Consul, Kubernetes DNS)
- **Load balancer config** (HAProxy, Envoy, NGINX)
- **Monitoring** (shard health, routing latency)
- **Operations runbooks** (add shard, migrate tenant, etc.)

## Key Design Decisions

### 1. Managements Are the Interface

The fractal doesn't expose shards. It exposes **Managements**—the same interface the core provides. This is crucial:

```typescript
// Consumer code is identical whether talking to:
// - A single core (spiral)
// - A fractal of 100 shards (fractal)
// - A cached fractal with read replicas (fractal + cache layer)

const result = await mgmt.listBookmarks({ userId: 'x' });
```

### 2. Slicing Is Declarative

You don't write routing logic. You declare **how** to slice:

```typescript
loom.fractal.split(core, {
  // "Route by user-id using consistent hashing"
  sliceBy: { field: 'user-id', strategy: 'consistent-hash', shards: 16 }
})
```

The loom generates the router. You can change the strategy without touching consumer code.

### 3. State Belongs to Shards

Each shard is **stateful** (has its slice of the domain). The fractal manages:
- **Placement**: Which shard owns which entities
- **Migration**: Moving entities between shards
- **Replication**: Copies of each shard for failover
- **Rebalancing**: Redistributing when adding/removing shards

### 4. Consumer Transparency

Consumers never see shard IDs, routing keys, or placement. They call Managements. The fractal:
- Extracts the routing key from call arguments
- Finds the right shard
- Handles retries, failover, migration in-progress
- Returns the result

## The Mathematics

The fractal is a **space-filling curve** of computation:

```
Domain Space (all possible entities)
         │
         ▼ hash/slice
   Shard Assignment
         │
         ▼ route
    FractalNode N
         │
         ▼ execute
    Management.call()
```

Or in category theory:
```
The fractal is a comonad: extract (whole → part), extend (apply to all parts)
Fractal(Core) gives you access to:
  - extract: Get a specific shard
  - extend: Apply a function to all shards
```

## Open Questions

Before weaving this warp:

1. **What can be sliced?**
   - Entity ID ✓ (consistent hashing)
   - Tenant ✓ (isolation)
   - Time range? (hot/cold data)
   - Random? (stateless compute)

2. **What about cross-shard operations?**
   - Transaction across shards? (Saga pattern?)
   - Query across all shards? (scatter-gather?)
   - Join between entities on different shards? (co-location hints?)

3. **How does state migration work?**
   - Live migration (dual-write then cutover)?
   - Offline migration (scheduled downtime)?
   - CRDTs (converge eventually)?

4. **Observability?**
   - Which shard handled this request?
   - Shard heatmaps (hot spots)?
   - Rebalancing metrics?

## The DSL (Vision)

```typescript
// loom/WARP.ts

// Basic fractal
export const users = loom.fractal.split(core, {
  sliceBy: 'user-id',
  shardCount: 16
});

// With replication
export const orders = loom.fractal.split(core, {
  sliceBy: 'order-id', 
  shardCount: 32,
  replication: {
    factor: 3,
    strategy: 'cross-az'  // Spread across availability zones
  }
});

// With auto-scaling
export const events = loom.fractal.split(core, {
  sliceBy: 'aggregate-id',
  autoScale: {
    minShards: 4,
    maxShards: 256,
    targetCpu: 60,
    scaleCooldown: '5m'
  }
});

// Multi-tenant with isolation
export const saas = loom.fractal.split(core, {
  sliceBy: 'tenant-id',
  isolation: 'shard-per-tenant',  // Each tenant gets own shard(s)
  placement: {
    'acme-corp': ['us-east-1a', 'us-east-1b'],
    'global-bank': ['eu-west-1a', 'eu-west-1b', 'eu-central-1a']
  }
});

// Consumer code - unchanged!
const userOrders = await orders.OrderMgmt.listForUser({ userId: 'x' });
```

## The Dream

A system where:
- You write core logic once (Managements)
- You declare how to scale (fractal split)
- Consumers see stable APIs (Management interface)
- The system grows organically (add shards, migrate tenants)
- Failures are contained (shard dies, others live)
- Changes are gradual (migrate one tenant at a time)

## The Reality

**Not yet implemented.** This is:
- A design space for horizontal scaling
- A test of the warp abstraction's flexibility
- A direction for future work

If you want to build it:
1. Study [spiral/](../spiral/) for the base patterns
2. Research consistent hashing (ketama, jump hash, rendezvous)
3. Look at Erlang/OTP mnesia for distributed state
4. Examine Kubernetes operators for shard lifecycle
5. Start with a simple router, grow from there

## The Poetry

```
The spiral wraps, the fractal breaks,
One conserves, one multiplies,
Ring around ring, or shard like shard,
Each pattern holds what inside lies.

The core is one, the core is many,
The consumer knows not which,
They call the Management, see the interface,
While underneath, the fractal's stitch
Binds shard to shard, routes call to call,
The loom weaves scale from small to all.
```

> *"The spiral conserves. The fractal multiplies. Both preserve the core's true face."*

---

*Status: Vision/Design • See [spiral/](../spiral/) for the implemented warp*
