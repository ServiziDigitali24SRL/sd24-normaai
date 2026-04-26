const heavy = [
  'next/dist/compiled/@edge-runtime/primitives',
  'next/dist/compiled/zod-validation-error',
  'next/dist/server/config',
  'next/dist/server/lib/router-utils/setup-dev-bundler',
];
(async () => {
  for (const m of heavy) {
    const t = Date.now();
    try { require(m); process.stdout.write('OK ' + (Date.now()-t) + 'ms: ' + m + '\n'); }
    catch(e) { process.stdout.write('skip: ' + m + '\n'); }
  }
  process.stdout.write('PREWARM DONE\n');
})();
