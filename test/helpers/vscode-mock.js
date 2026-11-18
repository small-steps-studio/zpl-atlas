'use strict';
// A small stand-in for the editor API, large enough to load the extension and drive its commands in unit tests. It records
// what the extension registers, shows, opens and copies. Not part of the package.

const Module = require('node:module');

class Uri {
  constructor(scheme, rest) { this.scheme = scheme; this.path = rest; }
  toString() { return this.scheme + ':' + this.path; }
  static parse(text) { const m = /^([a-z-]+):(.*)$/.exec(String(text)); return m ? new Uri(m[1], m[2]) : new Uri('file', String(text)); }
}
class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range { constructor(a, b) { this.start = a; this.end = b; } }
class Selection extends Range {}

function makeDocument(text, languageId, uri) {
  const doc = {
    _text: text, languageId: languageId || 'plaintext', uri: uri || Uri.parse('untitled:Untitled-' + Math.random().toString(36).slice(2)), version: 1,
    getText() { return doc._text; },
    get lineCount() { return doc._text.split('\n').length; },
    lineAt(i) { const lines = doc._text.split('\n'); const off = lines.slice(0, i).reduce((a, l) => a + l.length + 1, 0); return { range: { end: { offset: off + lines[i].length } } }; },
    offsetAt(pos) { return pos.offset !== undefined ? pos.offset : 0; }
  };
  return doc;
}

/** Creates the stand-in. `state` exposes everything the extension did; `answers` steers the dialogs. */
function createMock(options) {
  const o = options || {};
  const state = {
    commands: new Map(), executed: [], infoMessages: [], warningMessages: [], errorMessages: [], statusMessages: [], opened: [], clipboard: null,
    documents: [], shown: [], config: Object.assign({}, o.config || {}),
    answers: { info: o.infoAnswer, pick: o.pickAnswer, input: o.inputAnswer, warning: o.warningAnswer },
    activeTextEditor: o.text === undefined ? undefined : { document: makeDocument(o.text, o.languageId || 'plaintext', Uri.parse('file:/work/sample.' + (o.ext || 'txt'))) }
  };
  const vscode = {
    version: '1.95.0', Uri, Position, Range, Selection, EndOfLine: { LF: 1, CRLF: 2 },
    commands: {
      registerCommand(id, fn) { state.commands.set(id, fn); return { dispose() { state.commands.delete(id); } }; },
      async executeCommand(id, ...args) { state.executed.push({ id, args }); const fn = state.commands.get(id); return fn ? fn(...args) : undefined; }
    },
    window: {
      get activeTextEditor() { return state.activeTextEditor; },
      async showInformationMessage(text, ...buttons) { state.infoMessages.push({ text, buttons }); return state.answers.info; },
      async showWarningMessage(text, ...rest) { state.warningMessages.push({ text, rest }); return state.answers.warning; },
      async showErrorMessage(text, ...rest) { state.errorMessages.push({ text, rest }); return undefined; },
      async showQuickPick(items) { const list = await items; return typeof state.answers.pick === 'function' ? state.answers.pick(list) : state.answers.pick; },
      async showInputBox() { return state.answers.input; },
      setStatusBarMessage(text) { state.statusMessages.push(text); return { dispose() {} }; },
      async showTextDocument(doc) {
        state.shown.push(doc);
        return { document: doc, async edit(cb) { const b = { insert(pos, text) { doc._text = text + doc._text; }, setEndOfLine() {} }; cb(b); return true; } };
      },
      createOutputChannel() { return { appendLine() {}, dispose() {} }; }
    },
    workspace: {
      getConfiguration() { return { get: (k, d) => (k in state.config ? state.config[k] : d) }; },
      async openTextDocument(arg) {
        const doc = arg instanceof Uri ? makeDocument('', 'plaintext', arg) : makeDocument(arg.content, arg.language);
        state.documents.push(doc); return doc;
      },
      onDidChangeConfiguration() { return { dispose() {} }; }
    },
    languages: { async setTextDocumentLanguage(doc, lang) { doc.languageId = lang; return doc; } },
    env: { appName: 'Visual Studio Code', clipboard: { async writeText(t) { state.clipboard = t; } }, async openExternal(uri) { state.opened.push(String(uri)); return true; } }
  };
  return { vscode, state };
}

/** Makes `require('vscode')` return the mock until the returned function is called. */
function install(mock) {
  const original = Module._load;
  Module._load = function (request) { return request === 'vscode' ? mock : original.apply(this, arguments); };
  return function uninstall() { Module._load = original; };
}

/** A fake extension context with in-memory secret storage and global state. */
function makeContext(pkg) {
  const secrets = new Map(); const global = new Map();
  return {
    subscriptions: [], extension: { packageJSON: pkg },
    secrets: { get: async (k) => secrets.get(k), store: async (k, v) => { secrets.set(k, v); }, delete: async (k) => { secrets.delete(k); } },
    globalState: { get: (k, d) => (global.has(k) ? global.get(k) : d), update: async (k, v) => { if (v === undefined) global.delete(k); else global.set(k, v); }, keys: () => Array.from(global.keys()), _map: global }
  };
}

module.exports = { createMock, install, makeContext, makeDocument, Uri };
