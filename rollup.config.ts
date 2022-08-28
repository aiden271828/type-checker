import typescript from '@rollup/plugin-typescript';
import path from 'path';
import type {
  RollupOptions,
} from 'rollup';

const output = path.resolve(__dirname, 'lib');

const config: RollupOptions = {
  input: 'src/index.ts',
  output: [
    {
      name: 'RuntimeTypeCheck',
      file: `${output}/index.js`,
      format: 'umd',
    },
    {
      file: `${output}/index.cjs`,
      format: 'cjs',
    },
    {
      file: `${output}/index.mjs`,
      format: 'es',
    },
  ],
  plugins: [typescript()],
};

export default config;
