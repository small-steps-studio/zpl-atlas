'use strict';
// Hostile and odd ZPL for the adversarial test (invented; the payloads must come out as plain escaped text).
const PAY = ['x|y', '<b>y</b>', '[link](https://evil.test)', '![t](https://evil.test/p.png)', '<img src=https://evil.test/i.png>', '`code`', '*b*', '_i_', '<script>alert(1)</script>', '$x$', 'www.evil.test', '\|', '# heading'];
const cases = [];
PAY.forEach((p, i) => {
  cases.push({ name: 'payload ' + i, text: '^XA\n^PW' + p + '\n^LL' + p + '\n^FO' + p + '^A' + p + '^FD' + p + '^FS\n^FO10,10^BQN,2,6^FD' + p + '^FS\n^FO10,10^BEN^FD' + p + '^FS\n^FO10,10^B3N^FD' + p + '^FS\n^PQ' + p + '\n^XZ\n' });
});
cases.push({ name: 'prototype names', text: '^XA\n^FOconstructor,__proto__^A__proto__^FDtoString^FS\n^FO1,1^B__^FDvalueOf^FS\n^XZ\n' });
cases.push({ name: 'only carets', text: '^'.repeat(100000) });
cases.push({ name: 'only tildes', text: '~'.repeat(50000) + '^XA' + '~'.repeat(50000) });
cases.push({ name: 'huge data', text: '^XA^FO1,1^FD' + 'A'.repeat(500000) + '^FS^XZ' });
cases.push({ name: 'many xa', text: '^XA'.repeat(50000) });
cases.push({ name: 'huge numbers', text: '^XA^PW99999999999999999999^LL1e309^FO9999999999999999,-5^FDx^FS^PQ-3^XZ' });
module.exports = { cases };
