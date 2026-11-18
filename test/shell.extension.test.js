'use strict';
// Loads the whole extension against the stand-in editor API and drives the commands the way the editor would:
// registration, free reports, the Pro gate with the trial, samples, help and Report A Problem. No network is used.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createMock, install, makeContext } = require('./helpers/vscode-mock');
const pkg = require('../package.json');
const core = require('../src/core');
const { sampleFor, SAMPLE_IDS } = require('../src/samples');

const SRC = path.join(__dirname, '..', 'src');
const commandIds = pkg.contributes.commands.map((c) => c.command);
const free = pkg.contributes.commands.filter((c) => /\.show/.test(c.command) && !/ \(Pro\)$/.test(c.title) && c.command !== 'zplAtlas.showDocumentation');
const pro = pkg.contributes.commands.filter((c) => / \(Pro\)$/.test(c.title));
const sample = sampleFor(SAMPLE_IDS[0]);

function boot(options) {
  const o = options || {};
  const { vscode, state } = createMock(o);
  const uninstall = install(vscode);
  for (const key of Object.keys(require.cache)) if (key.startsWith(SRC)) delete require.cache[key];
  const savedFetch = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url) => { calls.push(String(url)); return { status: 404, json: async () => ({}) }; };
  const ext = require('../src/extension');
  const context = makeContext(pkg);
  if (o.trialExpired) { context.globalState._map.set('trial.startedAt', Date.now() - 40 * 864e5); context.globalState._map.set('trial.expiredAt', Date.now() - 20 * 864e5); }
  ext.activate(context);
  return { state, context, calls, run: (id, ...a) => state.commands.get(id)(...a), close: () => { globalThis.fetch = savedFetch; uninstall(); } };
}

test('every command in package.json is registered, and nothing else', () => {
  const h = boot({});
  try { assert.deepEqual([...h.state.commands.keys()].sort(), commandIds.slice().sort()); } finally { h.close(); }
});

test('there is at least one free and one Pro report', () => {
  assert.ok(free.length >= 1, 'free reports');
  assert.ok(pro.length >= 1, 'Pro reports');
});

test('each free report opens its Markdown report without a licence, a trial or a network call', async () => {
  for (const c of free) {
    const h = boot({ text: sample.text });
    try {
      await h.run(c.command);
      const doc = h.state.documents.find((d) => d.languageId === 'markdown');
      assert.ok(doc, c.command + ' opened no Markdown document');
      assert.ok(doc.getText().startsWith('# '), c.command);
      assert.equal(h.calls.length, 0, 'no network');
      assert.equal(h.state.infoMessages.length, 0, 'no licence message for a free report');
      assert.equal(h.context.globalState._map.has('trial.startedAt'), false, 'a free report does not start the trial');
    } finally { h.close(); }
  }
});

test('the first Pro report starts the 14-day trial, says so, and opens the report', async () => {
  const h = boot({ text: sample.text });
  try {
    await h.run(pro[0].command);
    assert.ok(h.context.globalState._map.has('trial.startedAt'), 'trial recorded');
    assert.match(h.state.infoMessages[0].text, /trial/i);
    assert.ok(h.state.documents.some((d) => d.languageId === 'markdown' && d.getText().startsWith('# ')));
    assert.equal(h.calls.length, 0, 'the trial uses no network');
  } finally { h.close(); }
});

test('after the trial a Pro report shows one notice with Buy Pro and Enter Licence Key and opens nothing', async () => {
  for (const c of pro) {
    const h = boot({ text: sample.text, trialExpired: true });
    try {
      await h.run(c.command);
      assert.equal(h.state.documents.filter((d) => d.languageId === 'markdown').length, 0, c.command);
      assert.equal(h.state.infoMessages.length, 1);
      assert.deepEqual(h.state.infoMessages[0].buttons, ['Buy Pro', 'Enter Licence Key']);
      assert.match(h.state.infoMessages[0].text, /Pro feature/);
    } finally { h.close(); }
  }
});

test('a report without an open editor asks for a file', async () => {
  const h = boot({});
  try { await h.run(free[0].command); assert.match(h.state.warningMessages[0].text, /needs/); } finally { h.close(); }
});

test('files over the size limit are refused with a message, not read', async () => {
  const h = boot({ text: 'x'.repeat(2 * 1024 * 1024), config: { maxFileSizeMB: 1 } });
  try { await h.run(free[0].command); assert.match(h.state.warningMessages[0].text, /size limit/); assert.equal(h.state.documents.length, 0); } finally { h.close(); }
});

test('the report is the same text the core produces, and the file itself is not changed', async () => {
  const h = boot({ text: sample.text });
  try {
    const before = h.state.activeTextEditor.document.getText();
    await h.run(free[0].command);
    const doc = h.state.documents.find((d) => d.languageId === 'markdown');
    const reportName = Object.keys(core).find((k) => /^report/.test(k) && core[k](sample.text) === doc.getText());
    assert.ok(reportName, 'the opened text equals a core report');
    assert.equal(h.state.activeTextEditor.document.getText(), before);
  } finally { h.close(); }
});

test('the samples open with invented data', async () => {
  for (const id of SAMPLE_IDS) {
    const h = boot({});
    try {
      await h.run('zplAtlas.' + id);
      assert.ok(h.state.documents.length >= 1);
      assert.ok(h.state.statusMessages.some((m) => /invented data/.test(m)));
    } finally { h.close(); }
  }
});

test('Report A Problem copies a block without file contents and opens the issues page', async () => {
  const h = boot({ text: sample.text });
  try {
    await h.run('zplAtlas.reportProblem');
    assert.ok(h.state.clipboard.startsWith('ZPL Atlas '));
    assert.ok(!h.state.clipboard.includes(sample.text.slice(0, 40)), 'no file contents');
    assert.ok(h.state.opened[0].includes('github.com/small-steps-studio/zpl-atlas/issues'));
  } finally { h.close(); }
});

test('Buy Pro opens the live checkout for Personal and asks for the number of users for Business', async () => {
  const h = boot({ pickAnswer: (list) => list[0] });
  try { await h.run('zplAtlas.buyPro'); assert.match(h.state.opened[0], /^https:\/\/checkout\.dodopayments\.com\/buy\/.+\?quantity=1$/); } finally { h.close(); }
  const b = boot({ pickAnswer: (list) => list[1], inputAnswer: '7' });
  try { await b.run('zplAtlas.buyPro'); assert.match(b.state.opened[0], /\?quantity=7$/); } finally { b.close(); }
});

test('a command that throws is reported with a message, not propagated', async () => {
  const h = boot({ text: 'x' });
  try {
    h.state.activeTextEditor = { document: { getText() { throw new Error('boom'); }, lineCount: 1, lineAt() { return { range: { end: {} } }; }, offsetAt() { return 1; } } };
    await h.run(free[0].command);
    assert.match(h.state.errorMessages[0].text, /boom/);
  } finally { h.close(); }
});
