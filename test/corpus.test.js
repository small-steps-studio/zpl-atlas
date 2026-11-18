'use strict';
// Every report on every corpus file (original invented samples, valid and invalid) against the expected output of an
// independent reference implementation (test/fixtures/golden.json). Table alignment markers and runs of spaces are
// normalised; the words, numbers and row order must match exactly.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/core');

const DIR = path.join(__dirname, 'fixtures', 'corpus');
const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'golden.json'), 'utf8'));
const norm = (s) => String(s).replace(/\|\s*:?-+:?\s*/g, '|---').replace(/[ \t]+/g, ' ').replace(/ \|/g, '|').replace(/\| /g, '|').replace(/\n{2,}/g, '\n').trim();

const files = fs.readdirSync(DIR).sort();
test('the corpus has at least 40 files', () => { assert.ok(files.length >= 40, files.length + ' files'); });

for (const f of files) {
  test('corpus ' + f, () => {
    const text = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const [report, want] of Object.entries(GOLDEN[f])) {
      const got = core[report](text);
      assert.equal(typeof got, 'string', report);
      if (want.exact !== undefined) assert.equal(norm(got), norm(want.exact), f + ' / ' + report);
      else assert.ok(got.startsWith(want.startsWith), f + ' / ' + report + ': expected the start "' + want.startsWith.replace(/\n/g, '\\n') + '", got "' + got.slice(0, 120).replace(/\n/g, '\\n') + '"');
    }
  });
}
