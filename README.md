# O19 (née October19)

## Create a new Tauri app

```sh
cd apps
pnpm create tauri-app -t svelte-ts AnAwesomeApp
```

Then add these scripts to `apps/AnAwesomeApp/package.json`:

```json
...
  "scripts": {
    ...,
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
...
```

And add any packages you need from the monorepo to
`apps/AnAwesomeApp/package.json`:

```json
  ...,
  "dependencies": {
    ...,
    "@repo/ui": "workspace:*"
  }
```

And update `turbo.json` to add these `tasks` if missing:

```json
{
  ...,
  "tasks": {
    ...,
    "tauri:dev": {
      "cache": false,
      "persistent": true
    },
    "tauri:build": {
      "outputs": ["src-tauri/target/**"]
    }
  }
}
```
