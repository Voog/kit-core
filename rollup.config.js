import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';

export default {
  entry: 'src/core.js',
  format: 'cjs',
  sourceMap: false,
  plugins: [
    json(),
    babel({
      exclude: 'node_modules/**'
    })
  ],
  external: [
    'fs',
    'path',
    'lodash',
    'mime-type/with-db',
    'voog',
    'bluebird',
    'highland',
    'request'
  ],
  dest: 'index.js'
};
