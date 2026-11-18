'use strict';
// Seeded fuzzing: thousands of damaged variants of the corpus files (cut, holes, inserted bytes, repeated pieces, swapped
// lines, binary noise). Every report must return a Markdown string that starts with a heading, never throw, and finish fast.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../src/core');

const DIR = path.join(__dirname, 'fixtures', 'corpus');
const texts = fs.readdirSync(DIR).sort().map((f) => fs.readFileSync(path.join(DIR, f), 'utf8'));
const reports = Object.keys(core).filter((k) => /^report/.test(k));

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const NOISE = ['\u0000', '�', '|', '"', '\\', '{', '}', '[', ']', '\r\n', '\n\n', '#', ';', '=', '\t', 'é', '\u{1F600}', '9'.repeat(40), '-1', 'null', 'NaN'];

function mutate(t, r) {
  const n = 1 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const at = Math.floor(r() * (t.length + 1)), k = Math.floor(r() * 6);
    if (k === 0) t = t.slice(0, at);
    else if (k === 1) t = t.slice(0, at) + t.slice(at + Math.floor(r() * 200));
    else if (k === 2) t = t.slice(0, at) + NOISE[Math.floor(r() * NOISE.length)] + t.slice(at);
    else if (k === 3) { const len = Math.floor(r() * 300); t = t.slice(0, at) + t.slice(at, at + len) + t.slice(at); }
    else if (k === 4) { const ls = t.split('\n'); const a = Math.floor(r() * ls.length), b = Math.floor(r() * ls.length); [ls[a], ls[b]] = [ls[b], ls[a]]; t = ls.join('\n'); }
    else { let s = ''; for (let j = 0; j < 20; j++) s += String.fromCharCode(Math.floor(r() * 256)); t = t.slice(0, at) + s + t.slice(at); }
  }
  return t;
}

test('seeded fuzz: every report returns a Markdown report for 2000 damaged inputs and never throws', () => {
  const r = rng(20261118);
  let calls = 0;
  for (let i = 0; i < 2000; i++) {
    const input = mutate(texts[i % texts.length], r);
    for (const rep of reports) {
      const t0 = Date.now();
      let md;
      assert.doesNotThrow(() => { md = core[rep](input); }, rep + ' threw on fuzz case ' + i);
      assert.equal(typeof md, 'string', rep);
      assert.ok(md.startsWith('# '), rep + ' did not start with a heading on fuzz case ' + i);
      assert.ok(Date.now() - t0 < 2000, rep + ' took too long on fuzz case ' + i);
      calls++;
    }
  }
  assert.ok(calls >= 2000 * reports.length);
});

test('odd inputs: empty, whitespace, only line breaks, a byte order mark, very long lines', () => {
  for (const input of ['', ' ', '\n\n\n', '\r\n', '﻿', 'x'.repeat(500000), '﻿' + texts[0]]) {
    for (const rep of reports) {
      const md = core[rep](input);
      assert.equal(typeof md, 'string');
      assert.ok(md.startsWith('# '), rep);
    }
  }
});
