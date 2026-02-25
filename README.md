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


----


```brainfuck
o20 stands for o(r  niz a  ional  i
.but that's v2.0  ga      t  a      z
.we  are in  v19   a niz a    l i     a
o19                  n   t     za   it
o     yeah,          i    i  li  tion)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
.      20 letters    za t  ona
```
