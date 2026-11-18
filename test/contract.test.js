'use strict';
// Contract tests: written from the specification examples. Do not edit; fix src/core.js instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core');

const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

test('core exports every specified function', () => {
  for (const n of ["tokenizeZpl", "parseFieldOrigin", "barcodeType", "dotsToMm", "reportLabels", "reportTextFields", "reportSyntax", "reportBarcodes", "reportLayout"]) assert.equal(typeof core[n], 'function', n);
});

test("tokenizeZpl example 1", () => {
  assert.deepStrictEqual(plain(core.tokenizeZpl("^XA\n^FO50,50^A0N,30,30^FDHi, there^FS\n^xz")), [{"cmd": "^XA", "params": "", "line": 1}, {"cmd": "^FO", "params": "50,50", "line": 2}, {"cmd": "^A", "params": "0N,30,30", "line": 2}, {"cmd": "^FD", "params": "Hi, there", "line": 2}, {"cmd": "^FS", "params": "", "line": 2}, {"cmd": "^XZ", "params": "", "line": 3}]);
});

test("tokenizeZpl example 2", () => {
  assert.deepStrictEqual(plain(core.tokenizeZpl("hello")), []);
});

test("parseFieldOrigin example 1", () => {
  assert.deepStrictEqual(plain(core.parseFieldOrigin("50,100")), {"x": 50, "y": 100});
});

test("parseFieldOrigin example 2", () => {
  assert.deepStrictEqual(plain(core.parseFieldOrigin("30")), {"x": 30, "y": 0});
});

test("parseFieldOrigin example 3", () => {
  assert.deepStrictEqual(plain(core.parseFieldOrigin("")), {"x": 0, "y": 0});
});

test("barcodeType example 1", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^BC")), "Code 128");
});

test("barcodeType example 2", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^BQ")), "QR Code");
});

test("barcodeType example 3", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^BY")), "");
});

test("barcodeType example 4", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^FD")), "");
});

test("barcodeType example 5", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^BD")), "MaxiCode");
});

test("barcodeType example 6", () => {
  assert.deepStrictEqual(plain(core.barcodeType("^B2")), "Interleaved 2 of 5");
});

test("dotsToMm example 1", () => {
  assert.deepStrictEqual(plain(core.dotsToMm(812, 203)), 101.6);
});

test("dotsToMm example 2", () => {
  assert.deepStrictEqual(plain(core.dotsToMm(1218, 300)), 103.1);
});

test("dotsToMm example 3", () => {
  assert.deepStrictEqual(plain(core.dotsToMm(0, 203)), 0);
});

test("reportLabels example 1", () => {
  const md = core.reportLabels("^XA\n^PW812\n^LL1218\n^FO50,50^A0N,40,40^FDShip To: ACME Corp^FS\n^FO50,120^A0N,30,30^FDOrder 10023^FS\n^FO50,200^BY3^BCN,100,Y,N,N^FD12345678^FS\n^FO50,400^BQN,2,6^FDQA,https://example.com/t/10023^FS\n^FO900,50^A0N,30,30^FDOUT OF AREA^FS\n^FO50,600^BEN,80,Y,N^FD400638133393^FS\n^PQ2\n^XZ\n^XA\n^FO20,20^FDNo end\n^XZ\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Labels", "2 labels.", "| 1 | 1-11 | 6 | 3 | 812 x 1218 dots | 2 |", "| 2 | 12-14 | 1 | 0 | - | 1 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportLabels example 2", () => {
  const md = core.reportLabels("no label here\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Labels", "The file contains no ZPL labels."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportTextFields example 1", () => {
  const md = core.reportTextFields("^XA\n^PW812\n^LL1218\n^FO50,50^A0N,40,40^FDShip To: ACME Corp^FS\n^FO50,120^A0N,30,30^FDOrder 10023^FS\n^FO50,200^BY3^BCN,100,Y,N,N^FD12345678^FS\n^FO50,400^BQN,2,6^FDQA,https://example.com/t/10023^FS\n^FO900,50^A0N,30,30^FDOUT OF AREA^FS\n^FO50,600^BEN,80,Y,N^FD400638133393^FS\n^PQ2\n^XZ\n^XA\n^FO20,20^FDNo end\n^XZ\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Text Fields", "| 1 | 4 | 50,50 | 0N,40,40 | Ship To: ACME Corp |", "| 1 | 8 | 900,50 | 0N,30,30 | OUT OF AREA |", "| 2 | 13 | 20,20 | - | No end |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportTextFields example 2", () => {
  const md = core.reportTextFields("no label here\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Text Fields", "The file contains no ZPL labels."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSyntax example 1", () => {
  const md = core.reportSyntax("^XA\n^PW812\n^LL1218\n^FO50,50^A0N,40,40^FDShip To: ACME Corp^FS\n^FO50,120^A0N,30,30^FDOrder 10023^FS\n^FO50,200^BY3^BCN,100,Y,N,N^FD12345678^FS\n^FO50,400^BQN,2,6^FDQA,https://example.com/t/10023^FS\n^FO900,50^A0N,30,30^FDOUT OF AREA^FS\n^FO50,600^BEN,80,Y,N^FD400638133393^FS\n^PQ2\n^XZ\n^XA\n^FO20,20^FDNo end\n^XZ\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Label Structure Check", "1 problem found.", "| 13 | field data is not closed with ^FS |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSyntax example 2", () => {
  const md = core.reportSyntax("^FO10,10^FDx^FS\n^XA\n^FO1,1^FDy^FS\n");
  assert.equal(typeof md, 'string');
  for (const s of ["4 problems found.", "| 1 | command ^FO outside a label |", "| 1 | command ^FS outside a label |", "| 2 | label is not closed with ^XZ |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSyntax example 3", () => {
  const md = core.reportSyntax("no label here\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Label Structure Check", "The file contains no ZPL labels."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportBarcodes example 1", () => {
  const md = core.reportBarcodes("^XA\n^PW812\n^LL1218\n^FO50,50^A0N,40,40^FDShip To: ACME Corp^FS\n^FO50,120^A0N,30,30^FDOrder 10023^FS\n^FO50,200^BY3^BCN,100,Y,N,N^FD12345678^FS\n^FO50,400^BQN,2,6^FDQA,https://example.com/t/10023^FS\n^FO900,50^A0N,30,30^FDOUT OF AREA^FS\n^FO50,600^BEN,80,Y,N^FD400638133393^FS\n^PQ2\n^XZ\n^XA\n^FO20,20^FDNo end\n^XZ\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Barcodes", "| 1 | 6 | 50,200 | Code 128 | 12345678 | ok |", "| 1 | 7 | 50,400 | QR Code | https\\:\\/\\/example.com/t/10023 | ok |", "| 1 | 9 | 50,600 | EAN-13 | 400638133393 | ok \\(check digit 1 added by the printer\\) |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportBarcodes example 2", () => {
  const md = core.reportBarcodes("^XA^FO0,0^BEN,80^FD4006381333932^FS^FO0,90^B3N,N,60^FDabc^FS^XZ");
  assert.equal(typeof md, 'string');
  for (const s of ["| 1 | 1 | 0,0 | EAN-13 | 4006381333932 | wrong check digit \\(expected 1\\) |", "| 1 | 1 | 0,90 | Code 39 | abc | characters not allowed in Code 39 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportBarcodes example 3", () => {
  const md = core.reportBarcodes("no label here\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Barcodes", "The file contains no ZPL labels."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportLayout example 1", () => {
  const md = core.reportLayout("^XA\n^PW812\n^LL1218\n^FO50,50^A0N,40,40^FDShip To: ACME Corp^FS\n^FO50,120^A0N,30,30^FDOrder 10023^FS\n^FO50,200^BY3^BCN,100,Y,N,N^FD12345678^FS\n^FO50,400^BQN,2,6^FDQA,https://example.com/t/10023^FS\n^FO900,50^A0N,30,30^FDOUT OF AREA^FS\n^FO50,600^BEN,80,Y,N^FD400638133393^FS\n^PQ2\n^XZ\n^XA\n^FO20,20^FDNo end\n^XZ\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Layout Check", "Label 1: 812 x 1218 dots = 101.6 x 152.4 mm at 203 dpi, 68.7 x 103.1 mm at 300 dpi.", "Label 2: size not set (^PW / ^LL missing).", "| 1 | 8 | 900,50 | x 900 is outside the print width 812 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportLayout example 2", () => {
  const md = core.reportLayout("no label here\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Layout Check", "The file contains no ZPL labels."]) assert.ok(md.includes(s), 'missing: ' + s);
});
