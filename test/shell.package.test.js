'use strict';
// Manifest rules: identity, pricing label, commands, walkthrough, settings, and the files that ship.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('../package.json');
const config = require('../src/licence/config');

const ROOT = path.join(__dirname, '..');

test('identity: publisher, name, repository and support links', () => {
  assert.equal(pkg.publisher, 'SmallStepsStudio');
  assert.equal(pkg.name, 'zpl-atlas');
  assert.equal(pkg.displayName, 'ZPL Atlas');
  assert.equal(config.productName, pkg.displayName);
  assert.equal(config.commandPrefix, 'zplAtlas');
  assert.equal(pkg.repository.url, 'https://github.com/small-steps-studio/zpl-atlas');
  assert.equal(config.issuesUrl, 'https://github.com/small-steps-studio/zpl-atlas/issues');
});

test('pricing is Trial, the engine is ^1.82.0 and there are no dependencies or activation events', () => {
  assert.equal(pkg.pricing, 'Trial');
  assert.equal(pkg.engines.vscode, '^1.82.0');
  assert.equal(pkg.dependencies, undefined);
  assert.deepEqual(pkg.activationEvents, []);
  assert.ok(pkg.keywords.length <= 30);
});

test('every command is prefixed and titled with the product name; Pro titles end with (Pro)', () => {
  for (const c of pkg.contributes.commands) {
    assert.ok(c.command.startsWith('zplAtlas.'), c.command);
    assert.ok(c.title.startsWith('ZPL Atlas: '), c.title);
  }
  const src = fs.readFileSync(path.join(ROOT, 'src', 'commands.js'), 'utf8');
  for (const c of pkg.contributes.commands) {
    const body = (src.split("reg('" + c.command + "'")[1] || '').split('reg(')[0];
    assert.equal(/requirePro\(/.test(body), / \(Pro\)$/.test(c.title), c.command);
  }
});

test('the walkthrough steps point at existing media and existing commands', () => {
  const ids = new Set(pkg.contributes.commands.map((c) => c.command));
  for (const w of pkg.contributes.walkthroughs) for (const s of w.steps) {
    assert.ok(fs.existsSync(path.join(ROOT, s.media.markdown)), s.media.markdown);
    for (const m of s.description.matchAll(/\(command:([^)]+)\)/g)) assert.ok(ids.has(m[1]), m[1]);
  }
});

test('no setting selects a licence environment; the settings are documented in the README', () => {
  const props = pkg.contributes.configuration.properties;
  for (const k of Object.keys(props)) assert.ok(!/licen[cs]e|mode|environment/i.test(k), k);
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  for (const k of Object.keys(props)) assert.ok(readme.includes('`' + k + '`'), k);
});

test('the release gate accepts the manifest (placeholders allowed in tests)', () => {
  assert.equal(config.assertShippable(pkg, { allowPlaceholders: true }), true);
});
