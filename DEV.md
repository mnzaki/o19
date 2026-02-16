# DEV

## Add new foundframe functionality

1. Write it in `crates/foundframe`
2. Bind it in `tauri-plugin-o19-ff`
    - add command to `src/commands.rs`
    - add command to `build.rs`
    - add command to `src/lib.rs`
    - add command permission to `permissions/default.toml`
    - invoke it from an adaptor method defined it `ts/adaptors/*.adaptor.ts`
3. Update TS service and port in `packages/foundframe`
4. Use it in an app like `DearDiary`
