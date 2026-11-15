import esbuild from 'esbuild';
await esbuild.build({
  entryPoints: ['server/index.ts'], bundle: true, platform: 'node', format: 'esm',
  target: 'node22', packages: 'external', outdir: 'dist-server',
  outExtension: { '.js': '.mjs' }, sourcemap: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
});
console.log('Production API and static frontend server built.');
