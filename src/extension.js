'use strict';
// ZPL Atlas entry point. Builds the shared `app` object and installs the commands; a failure in one part does not take
// the others down. Nothing runs until a command is used.

const vscode = require('vscode');
const os = require('node:os');
const { createLicence } = require('./licence/licence');
const { registerCommands } = require('./commands');
const { DEFAULTS } = require('./settings');

function numberSetting(value, fallback, min, max) {
  const n = Number(value);
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function activate(context) {
  let output = null;
  function log(text) {
    if (!output) output = vscode.window.createOutputChannel('ZPL Atlas');
    output.appendLine(text);
  }

  let settingsCache = null;
  function getSettings() {
    if (settingsCache) return settingsCache;
    const c = vscode.workspace.getConfiguration('zplAtlas');
    settingsCache = {
      maxFileSizeMB: numberSetting(c.get('maxFileSizeMB', DEFAULTS.maxFileSizeMB), DEFAULTS.maxFileSizeMB, 0.1, 50),
      openReportsAsPreview: c.get('openReportsAsPreview', DEFAULTS.openReportsAsPreview) !== false
    };
    return settingsCache;
  }

  // The licence server environment is the live one, always. No setting, command, environment
  // variable or editor mode changes it (a development host of the extension included).
  const licence = createLicence({ secrets: context.secrets, globalState: context.globalState });
  licence.checkTrial().then(undefined, function () { /* read-only state */ });

  const app = {
    vscode: vscode,
    context: context,
    licence: licence,
    getSettings: getSettings,
    defaults: DEFAULTS,
    log: log,
    extensionVersion: (context.extension && context.extension.packageJSON && context.extension.packageJSON.version) || require('../package.json').version,
    osRelease: function () { try { return os.release(); } catch (e) { return ''; } },
    // Length of a document without copying its text.
    lengthOf: function (document) {
      if (!document.lineCount) return document.getText().length;
      try { return document.offsetAt(document.lineAt(document.lineCount - 1).range.end); } catch (e) { return document.getText().length; }
    },
    tooLarge: function (document) { return app.lengthOf(document) > getSettings().maxFileSizeMB * 1024 * 1024; },
    settingsForReport: function () {
      const c = vscode.workspace.getConfiguration('zplAtlas');
      const out = {};
      for (const k of Object.keys(DEFAULTS)) out[k] = c.get(k, DEFAULTS[k]);
      return out;
    }
  };

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(function (event) {
    if (event.affectsConfiguration('zplAtlas')) settingsCache = null;
  }));

  try {
    registerCommands(app).forEach(function (d) { context.subscriptions.push(d); });
  } catch (err) {
    log('Could not start the commands: ' + (err && err.message ? err.message : err));
  }
}

function deactivate() {}

module.exports = { activate: activate, deactivate: deactivate, DEFAULTS: DEFAULTS };
