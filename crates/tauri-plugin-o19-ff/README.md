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
