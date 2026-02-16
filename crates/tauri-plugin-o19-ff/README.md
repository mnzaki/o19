# tauri-plugin-o19-ff

[O19](https://github.com/mnzaki/o19) is a foundational framework for local-first
peer-to-peer applications, and this is its Tauri adaptor.

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Svelte)                       │
│                    Drizzle ORM queries                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ Tauri IPC
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              tauri-plugin-o19-ff (THIS CRATE)               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Commands   │  │    State     │  │  Event Listeners │   │
│  │  (handlers)  │  │   (shared)   │  │   (background)   │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ EventBus
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                   o19_foundframe (domain)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │     PKB      │  │  TheStream™  │  │     Signal      │   │
│  │  (git repos) │  │ (orchestrate)│  │   (EventBus)    │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ TheStreamEvent
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                foundframe-to-sql (adapter)                  │
│              Listens to events, writes to DB                │
└──────────────────────┬──────────────────────────────────────┘
                       │ SQLite
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                        │
│                 The ViewModel for the UI                    │
└─────────────────────────────────────────────────────────────┘
```


## Flow of Setup

```
  Tauri Plugin Setup
      ↓
  o19_foundframe::init()          ← Single entry point
      ↓
  Starts Radicle node runtime     ← In background thread
      ↓
  Returns Foundframe { node_handle, events, ... }
      ↓
  foundframe.create_pkb_service() ← Uses node's profile for PKB path
      ↓
  TheStream::with_pubkey(pkb, events, pubkey)
      ↓
  StreamToSql adapter             ← Listens to TheStream events
      ↓
  SQLite                          ← Drizzle queries this
```

