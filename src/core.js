'use strict';

const BARCODES = {
  '^B0': 'Aztec',
  '^B1': 'Code 11',
  '^B2': 'Interleaved 2 of 5',
  '^B3': 'Code 39',
  '^B4': 'Code 49',
  '^B5': 'Planet Code',
  '^B7': 'PDF417',
  '^B8': 'EAN-8',
  '^B9': 'UPC-E',
  '^BA': 'Code 93',
  '^BB': 'CODABLOCK',
  '^BC': 'Code 128',
  '^BD': 'MaxiCode',
  '^BE': 'EAN-13',
  '^BF': 'MicroPDF417',
  '^BI': 'Industrial 2 of 5',
  '^BJ': 'Standard 2 of 5',
  '^BK': 'Codabar',
  '^BL': 'LOGMARS',
  '^BM': 'MSI',
  '^BO': 'Aztec',
  '^BP': 'Plessey',
  '^BQ': 'QR Code',
  '^BR': 'GS1 DataBar',
  '^BS': 'UPC/EAN extension',
  '^BT': 'TLC39',
  '^BU': 'UPC-A',
  '^BX': 'Data Matrix',
  '^BZ': 'POSTNET'
};

// Tokenizer and label reader (linear tokenizer; ^PQ quantity; field data is closed by ^FS).
function tokenizeZpl(text) {
  const s = String(text == null ? '' : text).replace(/^\uFEFF/, ''); const out = []; let line = 1, i = 0, nc = -1, nt = -1;
  while (i < s.length && s[i] !== '^' && s[i] !== '~') { if (s[i] === '\n') line++; i++; }
  while (i < s.length) {
    const start = line; const pre = s[i];
    let cmd = (pre + s.substr(i + 1, 2)).toUpperCase(); let j;
    if (cmd[1] === 'A' && pre === '^') { cmd = '^A'; j = i + 2; } else j = i + 3;
    // parameters run to the next '^' or '~' (found with indexOf, not character by character); CR and LF are dropped from them
    // (the next position of each prefix is remembered, so a file without '~' is not searched to its end for every command)
    if (nc < j) { nc = s.indexOf('^', j); if (nc < 0) nc = Infinity; }
    if (nt < j) { nt = s.indexOf('~', j); if (nt < 0) nt = Infinity; }
    const end = Math.max(j, Math.min(nc, nt, s.length)); const raw = s.slice(j, end);
    for (let q = raw.indexOf('\n'); q >= 0; q = raw.indexOf('\n', q + 1)) line++;
    out.push({ cmd, params: raw.indexOf('\n') < 0 && raw.indexOf('\r') < 0 ? raw : raw.replace(/[\r\n]/g, ''), line: start }); i = end;
  }
  return out;
}
function parseFieldOrigin(params) {
  if (typeof params !== 'string') return { x: 0, y: 0 };
  const parts = params.split(',');
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  return {
    x: isNaN(x) ? 0 : x,
    y: isNaN(y) ? 0 : y
  };
}

function barcodeType(cmd) {
  return BARCODES[cmd] || '';
}

function dotsToMm(dots, dpi) {
  if (typeof dots !== 'number' || typeof dpi !== 'number' || dots <= 0 || dpi <= 0) return 0;
  return Math.round((dots * 25.4 / dpi) * 10) / 10;
}

function escapeMarkdown(text) {
  if (typeof text !== 'string') return '';
  let res = text.replace(/\\/g, '\\\\');
  res = res.replace(/`/g, '\\`');
  res = res.replace(/\*/g, '\\*');
  res = res.replace(/_/g, '\\_');
  res = res.replace(/\{/g, '\\{');
  res = res.replace(/\}/g, '\\}');
  res = res.replace(/\[/g, '\\[');
  res = res.replace(/\]/g, '\\]');
  res = res.replace(/\(/g, '\\(');
  res = res.replace(/\)/g, '\\)');
  res = res.replace(/#/g, '\\#');
  res = res.replace(/\+/g, '\\+');
  res = res.replace(/!/g, '\\!');
  res = res.replace(/\|/g, '\\|');
  res = res.replace(/</g, '\\<');
  res = res.replace(/>/g, '\\>');
  res = res.replace(/~/g, '\\~');
  res = res.replace(/&/g, '\\&');
  res = res.replace(/\$/g, '\\$');
  res = res.replace(/:\/\//g, '\\:\\/\\/');
  res = res.replace(/(^|[^a-zA-Z0-9])www\./g, '$1www\\.');
  res = res.replace(/\r?\n/g, ' ');
  return res;
}

function cell(value) {
  const s = escapeMarkdown(value);
  return s === '' ? '-' : s;
}

function pluralize(n, singular, plural) {
  return n === 1 ? singular : plural;
}

const pl = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const escR = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1')
  .split('://').join('\\:\\/\\/').replace(/(^|[^A-Za-z0-9])www\./gi, (m, pre) => pre + m.slice(pre.length, pre.length + 3) + '\\.');
const cellR = (s) => { s = String(s == null ? '' : s); return s === '' ? '-' : escR(s); };
function cd(d) { let s = 0; d.split('').reverse().forEach((c, i) => { s += +c * (i % 2 === 0 ? 3 : 1); }); return (10 - (s % 10)) % 10; }
function readLabels(text) {
  const toks = tokenizeZpl(text); const labels = []; const problems = []; let L = null, F = null;
  const closeField = (endTok) => { if (F) { if (F.fd && !F.fs) problems.push([F.fdLine, 'field data is not closed with ^FS']); L.fields.push(F); F = null; } };
  for (const t of toks) {
    if (t.cmd === '^XA') { if (L) { closeField(); problems.push([L.first, 'label is not closed with ^XZ']); } L = { n: labels.length + 1, first: t.line, last: t.line, fields: [], pw: 0, ll: 0, pq: 1, closed: false }; labels.push(L); continue; }
    if (!L) { if (t.cmd === '^XZ') problems.push([t.line, '^XZ without ^XA']); else if (t.cmd[0] === '^') problems.push([t.line, 'command ' + t.cmd + ' outside a label']); continue; }
    L.last = t.line;
    if (t.cmd === '^XZ') { closeField(); L.closed = true; L = null; continue; }
    if (t.cmd === '^PW') L.pw = parseInt(t.params, 10) || 0;
    if (t.cmd === '^LL') L.ll = parseInt(t.params, 10) || 0;
    if (t.cmd === '^PQ') L.pq = parseInt(t.params.split(',')[0], 10) || 1;
    if (t.cmd === '^FO' || t.cmd === '^FT') { closeField(); F = { pos: parseFieldOrigin(t.params), line: t.line, font: '', type: '', fd: false, data: '', fs: false }; continue; }
    if (F) {
      if (t.cmd === '^A') F.font = t.params;
      if (barcodeType(t.cmd)) F.type = barcodeType(t.cmd);
      if (t.cmd === '^FD' || t.cmd === '^FV' || t.cmd === '^SN') { F.fd = true; F.data = t.params; F.fdLine = t.line; }
      if (t.cmd === '^FS') { F.fs = true; L.fields.push(F); F = null; }
    }
  }
  if (L) { closeField(); problems.push([L.first, 'label is not closed with ^XZ']); }
  return { labels, problems };
}
const none = (t) => '# ' + t + '\n\nThe file contains no ZPL labels.';
const pos = (f) => f.pos.x + ',' + f.pos.y;
function reportLabels(text) {
  const m = readLabels(text); if (!m.labels.length) return none('Labels');
  return '# Labels\n\n' + pl(m.labels.length, 'label') + '.\n\n| Label | Lines | Fields | Barcodes | Size | Quantity |\n| ---: | --- | ---: | ---: | --- | ---: |\n' +
    m.labels.map((l) => '| ' + l.n + ' | ' + l.first + '-' + l.last + ' | ' + l.fields.length + ' | ' + l.fields.filter((f) => f.type).length + ' | ' + (l.pw && l.ll ? l.pw + ' x ' + l.ll + ' dots' : '-') + ' | ' + l.pq + ' |').join('\n');
}
function reportTextFields(text) {
  const m = readLabels(text); if (!m.labels.length) return none('Text Fields'); const rows = [];
  m.labels.forEach((l) => l.fields.filter((f) => !f.type && f.fd).forEach((f) => rows.push('| ' + l.n + ' | ' + f.fdLine + ' | ' + pos(f) + ' | ' + cellR(f.font) + ' | ' + cellR(f.data) + ' |')));
  return '# Text Fields\n\n' + (rows.length ? '| Label | Line | Position | Font | Text |\n| ---: | ---: | --- | --- | --- |\n' + rows.join('\n') : 'No text fields.');
}
function reportSyntax(text) {
  const m = readLabels(text); if (!m.labels.length && !m.problems.length) return none('Label Structure Check');
  if (!m.labels.length) return none('Label Structure Check');
  if (!m.problems.length) return '# Label Structure Check\n\nNo problems found.';
  const p = m.problems.slice().sort((a, b) => a[0] - b[0]);
  return '# Label Structure Check\n\n' + pl(p.length, 'problem') + ' found.\n\n| Line | Problem |\n| ---: | --- |\n' + p.map((x) => '| ' + x[0] + ' | ' + cellR(x[1]) + ' |').join('\n');
}
function check(type, d) {
  if (type === 'QR Code') return /^[HQML][AM],/.test(d) ? [d.slice(3), 'ok'] : [d, 'missing error-correction prefix (for example QA,)'];
  const gtin = (n, name) => {
    if (new RegExp('^\\d{' + n + '}$').test(d)) return [d, 'ok (check digit ' + cd(d) + ' added by the printer)'];
    if (new RegExp('^\\d{' + (n + 1) + '}$').test(d)) { const e = cd(d.slice(0, -1)); return [d, e === +d.slice(-1) ? 'ok' : 'wrong check digit (expected ' + e + ')']; }
    return [d, name + ' needs ' + n + ' or ' + (n + 1) + ' digits'];
  };
  if (type === 'EAN-13') return gtin(12, 'EAN-13');
  if (type === 'UPC-A') return gtin(11, 'UPC-A');
  if (type === 'EAN-8') return gtin(7, 'EAN-8');
  if (type === 'Code 39') return [d, /^[A-Z0-9 \-.$/+%]*$/.test(d) && d ? 'ok' : 'characters not allowed in Code 39'];
  return [d, d ? 'ok' : 'no data'];
}
function reportBarcodes(text) {
  const m = readLabels(text); if (!m.labels.length) return none('Barcodes'); const rows = [];
  m.labels.forEach((l) => l.fields.filter((f) => f.type).forEach((f) => { const [d, c] = check(f.type, f.data); rows.push('| ' + l.n + ' | ' + (f.fdLine || f.line) + ' | ' + pos(f) + ' | ' + f.type + ' | ' + cellR(d) + ' | ' + cellR(c) + ' |'); }));
  return '# Barcodes\n\n' + (rows.length ? '| Label | Line | Position | Type | Data | Check |\n| ---: | ---: | --- | --- | --- | --- |\n' + rows.join('\n') : 'No barcodes in this file.');
}
function reportLayout(text) {
  const m = readLabels(text); if (!m.labels.length) return none('Layout Check'); const lines = [], rows = [];
  m.labels.forEach((l) => {
    lines.push(l.pw && l.ll ? 'Label ' + l.n + ': ' + l.pw + ' x ' + l.ll + ' dots = ' + dotsToMm(l.pw, 203) + ' x ' + dotsToMm(l.ll, 203) + ' mm at 203 dpi, ' + dotsToMm(l.pw, 300) + ' x ' + dotsToMm(l.ll, 300) + ' mm at 300 dpi.'
      : 'Label ' + l.n + ': size not set (^PW / ^LL missing).');
    l.fields.forEach((f) => { if (l.pw && f.pos.x >= l.pw) rows.push('| ' + l.n + ' | ' + f.line + ' | ' + pos(f) + ' | x ' + f.pos.x + ' is outside the print width ' + l.pw + ' |');
      if (l.ll && f.pos.y >= l.ll) rows.push('| ' + l.n + ' | ' + f.line + ' | ' + pos(f) + ' | y ' + f.pos.y + ' is outside the label length ' + l.ll + ' |'); });
  });
  return '# Layout Check\n\n' + lines.join('\n\n') + '\n\n' + (rows.length ? '| Label | Line | Position | Problem |\n| ---: | ---: | --- | --- |\n' + rows.join('\n') : 'All fields are inside the print area.');
}
module.exports = {
  tokenizeZpl,
  parseFieldOrigin,
  barcodeType,
  dotsToMm,
  reportLabels,
  reportTextFields,
  reportSyntax,
  reportBarcodes,
  reportLayout
};

// Caps every Markdown table of a report at 500 rows and says how many there were (a 50 MB file would otherwise give a report
// too large to open). Applied to every exported report.
function capTables(md) {
  if (typeof md !== 'string') return md;
  const lines = md.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    if (lines[i].startsWith('|') && /^\|[ :-]+\|/.test(lines[i + 1] || '')) {
      out.push(lines[++i]);
      let n = 0;
      while (i + 1 < lines.length && lines[i + 1].startsWith('|')) { i++; n++; if (n <= 500) out.push(lines[i]); }
      if (n > 500) { out.push(''); out.push('Showing the first 500 of ' + n + ' rows.'); }
    }
  }
  return out.join('\n');
}
for (const k of Object.keys(module.exports)) {
  if (k.startsWith('report')) { const f = module.exports[k]; module.exports[k] = function (text) { return capTables(f(text)); }; }
}
