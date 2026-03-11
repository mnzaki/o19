# NEXTUP

# DOING

# TODO

- app starter script
  - clone o19 itself then run this script to create your own monorepo
  - the new monorepo is configured to also see the packages in o19
    - so when you develop, if there's code that goes into o19 just add it there
      and push a branch to your clone
      - so let's make it easy to link your o19 clone to your fork

# DONE and committed

# TODO LAAAAAAAATER

### APP-012: Ferroring - Compassionate Error System 🦀

**Status**: 📋 **DESIGN COMPLETE** - Ready for implementation  
**Package**: `o19/packages/ferroring`  
**Docs**: `.kimi/kimprint/1NBOX/APP-012-ferroring-compassionate-errors.md`

**Vision**: Transform errors from cryptic crashes into teaching moments. Like Rust's compiler, understand intent and suggest fixes.

```
❌ Before: "TreadleDefinition must have methods configuration"

✅ After:
┌─ Treadle Has No Purpose ───────────────────────────────┐
│                                                         │
│  Your treadle 'my-treadle' has nothing to do!          │
│                                                         │
│  💡 Generate files from methods:                       │
│     methods: { filter: 'core' },                        │
│     outputs: [{ template: '...', path: '...' }]       │
│                                                         │
│  💡 Wire existing code into the app:                   │
│     hookups: [{ path: 'src/lib.rs', ... }]            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Components:**
- `ContextStack` - Async context capture for rich error context
- `SuggestionEngine` - Intent inference + ranked fix suggestions  
- `TerminalRenderer` - Beautiful CLI output
- `MUDRenderer` - Narrative error mode

**Next Steps:**
1. Create `o19/packages/ferroring` package
2. Implement `Ferror` base class + `ContextStack`
3. Convert spire-loom errors to use ferroring
4. Integrate into Interactive CLI and MUD interfaces

