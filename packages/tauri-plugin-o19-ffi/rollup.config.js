import { readFileSync } from 'fs'
import { join } from 'path'
import { cwd } from 'process'
import typescript from '@rollup/plugin-typescript'

const pkg = JSON.parse(readFileSync(join(cwd(), 'package.json'), 'utf8'))

export default {
  input: 'ts/index.ts',
  output: [
    {
      file: "js-dist/index.js",
      format: 'esm',
      sourcemap: true
    },
    {
      file: "js-dist/index.cjs",
      format: 'cjs',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({
      declaration: true,
      declarationDir: "js-dist"
    })
  ],
  external: [
    /^@tauri-apps\/api/,
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ]
}
