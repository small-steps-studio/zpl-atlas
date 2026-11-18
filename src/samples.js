'use strict';
// The sample files of the Open Sample commands. All data is invented for this product; it names no real company, person or system.

const SAMPLES = {
 "openSample": {
  "title": "Open Sample File",
  "fileName": "warehouse-labels.zpl",
  "languageId": "plaintext",
  "text": "^XA\n^FX Invented shipping label for a warehouse (sample data).\n^PW812\n^LL1218\n^CI28\n^FO40,40^GB732,1138,4^FS\n^FO70,80^A0N,48,48^FDACME WAREHOUSE^FS\n^FO70,150^A0N,30,30^FDShip to: Example Retail, Dock 4^FS\n^FO70,200^A0N,30,30^FDOrder 10023 / Box 3 of 5^FS\n^FO70,280^BY3,3,120^BCN,120,Y,N,N^FD>;0950600013435210023^FS\n^FO70,480^BQN,2,6^FDQA,https://example.test/track/10023^FS\n^FO420,500^BEN,100,Y,N^FD4006381333932^FS\n^FO70,760^BXN,8,200^FDLOT-2207-0001^FS\n^FO70,1000^A0N,28,28^FDHandle with care^FS\n^PQ5,0,1,Y\n^XZ\n^XA\n^FX Second label: a small shelf label.\n^PW406\n^LL203\n^FO20,20^A0N,30,30^FDShelf B-12^FS\n^FO20,70^B3N,N,60,Y,N^FDBIN-B12^FS\n^FO450,20^A0N,24,24^FDoff the label^FS\n^XZ\n"
 }
};

/** The sample with the given id, or null. */
function sampleFor(id) { return SAMPLES[id] || null; }

module.exports = { sampleFor: sampleFor, SAMPLE_IDS: Object.keys(SAMPLES) };
