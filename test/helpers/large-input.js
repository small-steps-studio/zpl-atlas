'use strict';
// Builds a ZPL text of about `bytes` characters for the large-file test (invented labels).
function make(bytes) {
  const parts = []; let size = 0, i = 0;
  while (size < bytes) {
    const s = '^XA\n^PW812\n^LL1218\n^FO50,50^A0N,30,30^FDLabel ' + i + ' ' + 'x'.repeat(80) + '^FS\n^FO50,150^BCN,100,Y,N,N^FDORD-' + i + '^FS\n^FO50,400^BEN,80,Y,N^FD400638133393^FS\n^PQ' + (1 + i % 9) + '\n^XZ\n';
    parts.push(s); size += s.length; i++;
  }
  return parts.join('');
}
module.exports = { make };
