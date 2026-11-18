'use strict';
// Large files: a 50 MB input built by test/helpers/large-input.js. Every report must finish and return a report inside a
// process whose JavaScript heap is capped at 1 GB (the process would crash if a report needed more).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const cp = require('node:child_process');

const CHILD = `
const core = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'core.js'))});
const { make } = require(${JSON.stringify(path.join(__dirname, 'helpers', 'large-input.js'))});
const text = make(50 * 1024 * 1024);
const out = { size: text.length, reports: {} };
for (const r of Object.keys(core).filter((k) => /^report/.test(k))) {
  const t0 = Date.now();
  const md = core[r](text);
  out.reports[r] = { ms: Date.now() - t0, ok: typeof md === 'string' && md.startsWith('# '), length: md.length };
}
out.heapMB = Math.round(process.memoryUsage().heapUsed / 1048576);
process.stdout.write(JSON.stringify(out));
`;

test('every report reads a 50 MB file inside a 1 GB heap, in time', () => {
  const r = cp.spawnSync(process.execPath, ['--max-old-space-size=1024', '-e', CHILD], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 15 * 60 * 1000 });
  assert.equal(r.status, 0, 'the capped process failed (heap limit or error): ' + String(r.stderr).slice(-600));
  const out = JSON.parse(r.stdout);
  assert.ok(out.size >= 50 * 1024 * 1024 * 0.95, 'input size ' + out.size);
  const budget = process.env.CI ? 120000 : 60000;
  for (const [name, rep] of Object.entries(out.reports)) {
    assert.ok(rep.ok, name + ' did not return a report');
    assert.ok(rep.ms < budget, name + ' took ' + rep.ms + ' ms');
    assert.ok(rep.length < 20 * 1024 * 1024, name + ' produced ' + rep.length + ' characters');
  }
});
