process.stdout.write('start\n');
const start = Date.now();
try {
  require('next/dist/compiled/@edge-runtime/primitives');
  process.stdout.write('OK (' + (Date.now()-start) + 'ms)\n');
} catch(e) {
  process.stdout.write('ERR (' + (Date.now()-start) + 'ms): ' + e.message.split('\n')[0] + '\n');
}
process.stdout.write('done\n');
