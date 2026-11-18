'use strict';
// Shared command helpers: registration with a common error message, notifications, links, new
// editors, the active text editor, and the Pro gate (licence first, then the free trial).

const config = require('./licence/config');
const messages = require('./licence/messages');

const BUTTONS = Object.freeze({ buy: 'Buy Pro', enter: 'Enter Licence Key', lost: 'Lost your key?', remove: 'Remove Licence', report: 'Report A Problem' });
const NAME = config.productName;

function createUi(app) {
  const vscode = app.vscode;
  const disposables = [];

  function reg(id, fn) {
    disposables.push(vscode.commands.registerCommand(id, async function () {
      try {
        return await fn.apply(null, arguments);
      } catch (err) {
        const why = err && err.message ? err.message : 'the command could not be completed.';
        vscode.window.showErrorMessage(NAME + ': ' + why + ' If this keeps happening, run "' + NAME + ': Report A Problem".');
        return undefined;
      }
    }));
  }
  function info() { return vscode.window.showInformationMessage.apply(vscode.window, Array.prototype.slice.call(arguments)); }
  function warn(text) { return vscode.window.showWarningMessage.apply(vscode.window, [NAME + ': ' + text].concat(Array.prototype.slice.call(arguments, 1))); }

  async function openExternal(url) {
    try { return await vscode.env.openExternal(vscode.Uri.parse(url)); } catch (e) {
      warn('The link could not be opened by the editor. Open it in your browser: ' + url);
      return false;
    }
  }
  async function handleLicenceButton(pick) {
    if (pick === BUTTONS.buy) await vscode.commands.executeCommand('zplAtlas.buyPro');
    else if (pick === BUTTONS.enter) await vscode.commands.executeCommand('zplAtlas.enterKey');
    else if (pick === BUTTONS.remove) await vscode.commands.executeCommand('zplAtlas.removeLicence');
    else if (pick === BUTTONS.lost) await showLostKey();
  }
  async function showLostKey() {
    const pick = await info(messages.lostKeyText(), BUTTONS.enter, BUTTONS.report);
    if (pick === BUTTONS.enter) await vscode.commands.executeCommand('zplAtlas.enterKey');
    else if (pick === BUTTONS.report) await vscode.commands.executeCommand('zplAtlas.reportProblem');
  }

  // Licence first; without one the free trial starts at the first Pro use, then runs out.
  async function requirePro(feature) {
    if (await app.licence.isPro()) return true;
    // checkTrial records the last use and, once it is seen, the end of the trial.
    let trial = await app.licence.checkTrial();
    if (trial.state === 'unused') {
      trial = await app.licence.startTrial();
      if (trial.state === 'active') {
        await app.licence.noteTrialReminder();
        info(messages.trialStartedText(trial), BUTTONS.buy, BUTTONS.enter).then(handleLicenceButton).then(undefined, function () { /* closed */ });
        return true;
      }
    }
    if (trial.state === 'active') {
      if (await app.licence.noteTrialReminder()) info(messages.trialReminderText(trial), BUTTONS.buy, BUTTONS.enter).then(handleLicenceButton).then(undefined, function () { /* closed */ });
      return true;
    }
    const pick = await info(messages.proNoticeText(feature, trial), BUTTONS.buy, BUTTONS.enter);
    await handleLicenceButton(pick);
    return false;
  }

  // The active text editor; when there is none, says so and returns null. Files larger than the
  // size limit are refused with a clear message instead of being read.
  function textEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      // VS Code does not pass files larger than 50 MB to extensions: the tab is open, but there is no text editor for it.
      let tabPath = '';
      try {
        const tab = vscode.window.tabGroups && vscode.window.tabGroups.activeTabGroup && vscode.window.tabGroups.activeTabGroup.activeTab;
        tabPath = tab && tab.input && tab.input.uri ? String(tab.input.uri.path || '') : '';
      } catch (e) { tabPath = ''; }
      if (/\.(zpl|prn|txt)$/i.test(tabPath)) {
        warn('This file is not available to extensions: VS Code passes files only up to 50 MB to extensions. Split the file, or save a shorter one, and run the command again.');
        return null;
      }
      warn('This command needs a ZPL label file (.zpl, .prn or a text file with ZPL) in the active editor. Open one, or run "' + NAME + ': Open Sample File" to try one.');
      return null;
    }
    if (app.tooLarge && app.tooLarge(editor.document)) {
      warn('This file is larger than the size limit (setting zplAtlas.maxFileSizeMB, now ' + app.getSettings().maxFileSizeMB + ' MB). Raise the limit to read it.');
      return null;
    }
    return editor;
  }

  // Opens content in a new unsaved editor named `name` (numbered when the name is used already).
  const untitledNames = new Map();
  async function openText(content, language, name) {
    if (name) {
      try {
        const n = (untitledNames.get(name) || 0) + 1;
        untitledNames.set(name, n);
        const unique = n === 1 ? name : name.replace(/(\.[^.]+)?$/, '-' + n + '$1');
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse('untitled:' + unique));
        const editor = await vscode.window.showTextDocument(doc, { preview: false });
        if (editor && typeof editor.edit === 'function' && doc.getText() === '') {
          // Keep the line breaks of the content (an untitled editor would otherwise use the
          // editor's default, which would change the line endings of the content).
          const eol = vscode.EndOfLine ? (content.indexOf('\r\n') !== -1 ? vscode.EndOfLine.CRLF : vscode.EndOfLine.LF) : undefined;
          const ok = await editor.edit(function (b) {
            b.insert(new vscode.Position(0, 0), content);
            if (eol !== undefined && typeof b.setEndOfLine === 'function' && /[\r\n]/.test(content)) b.setEndOfLine(eol);
          });
          if (ok) {
            if (language && doc.languageId !== language) await vscode.languages.setTextDocumentLanguage(doc, language).then(undefined, function () { /* keep */ });
            return doc;
          }
        }
      } catch (e) { /* fall back to an editor named by the editor */ }
    }
    const doc = await vscode.workspace.openTextDocument({ content: content, language: language });
    await vscode.window.showTextDocument(doc, { preview: false });
    return doc;
  }

  function baseName(uri) {
    const p = String(uri.path || uri.fsPath || uri.toString());
    const name = p.slice(p.lastIndexOf('/') + 1).replace(/\\/g, '/');
    const last = name.slice(name.lastIndexOf('/') + 1);
    return last.replace(/\.[^.]*$/, '') || 'file';
  }

  return { reg: reg, info: info, warn: warn, openExternal: openExternal, handleLicenceButton: handleLicenceButton, showLostKey: showLostKey, requirePro: requirePro,
    textEditor: textEditor, openText: openText, baseName: baseName, disposables: disposables, BUTTONS: BUTTONS, NAME: NAME };
}

module.exports = { createUi: createUi, BUTTONS: BUTTONS };
