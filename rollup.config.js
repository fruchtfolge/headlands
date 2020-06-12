import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import pkg from './package.json'

export default [
  // browser-friendly (minified) UMD build
  {
    input: './index.js',
    external: [
      '@turf/turf',
      // 'jsts'
    ],
    output: {
      name: 'headland',
      file: pkg.browser,
      format: 'umd',
      globals: {
        '@turf/turf': 'turf',
        // 'jsts': 'jsts'
      }
    },
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ]
  },
  {
    input: './index.js',
    external: [
      '@turf/turf',
      // 'jsts'
    ],
    output: {
      name: 'headland',
      file: 'docs/assets/headland.min.js',
      format: 'umd',
      globals: {
        '@turf/turf': 'turf',
        // 'jsts': 'jsts'
      }
    },
    plugins: [
      resolve(),
      commonjs(),
      // terser()
    ]
  },
  // node js and module version
  {
    input: './index.js',
    external: [
      '@turf/turf',
      'polygon-clipping'
      // 'jsts'
    ],
    output: [{
      file: pkg.main,
      format: 'cjs'
    },
    {
      file: pkg.module,
      format: 'es'
    }
    ]
  }
]
