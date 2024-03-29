const esbuild = require('esbuild');

// copied from https://github.com/yanm1ng/esbuild-plugin-external-global
const handle_external_globals = (externals) => {
  const name = 'globals';
  return {
    name,
    setup(build) {
      build.onResolve({ filter: new RegExp('^(' + Object.keys(externals).join('|') + ')$') }, (args) => ({
        path: args.path,
        namespace: name,
      }));
      build.onLoad({ filter: /.*/, namespace: name }, (args) => {
        return { contents: `module.exports = ${externals[args.path]}` };
      });
    },
  };
};

async function main() {
  const name = 'chartjs-scale-timestack';

  const replace_globals = handle_external_globals({
    'chart.js': 'Chart',
    luxon: 'luxon',
  });

  const common = {
    packages: 'external',
    bundle: true,
    platform: 'browser',
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    entryPoints: ['src/index.ts'],
  };

  const esm = {
    ...common,
    format: 'esm',
    outfile: `dist/index.esm.js`,
  };

  const cjs = {
    ...common,
    format: 'cjs',
    outfile: `dist/index.cjs.js`,
  };

  const iife = {
    ...common,
    format: 'iife',
    outfile: `dist/${name}.js`,
    globalName: '_timestack',
    plugins: [replace_globals],
  };

  const iife_min = {
    ...common,
    format: 'iife',
    minify: true,
    outfile: `dist/${name}.min.js`,
    globalName: '_timestack',
    plugins: [replace_globals],
  };

  for (const cfg of [esm, cjs, iife, iife_min]) {
    esbuild.build(cfg);
  }
}

main();
