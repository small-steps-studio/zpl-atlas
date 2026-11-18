# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Labels

Command: **ZPL Atlas: Show Labels**

Lists every label (from ^XA to ^XZ) with the lines it spans, the number of fields and of barcode fields, its size in dots when ^PW and ^LL are set, and the print quantity from ^PQ (1 when not set).

Example (sample file):

> # Labels
>
> 2 labels.
>
> | Label | Lines | Fields | Barcodes | Size | Quantity |
> | ---: | --- | ---: | ---: | --- | ---: |
> | 1 | 1-16 | 9 | 4 | 812 x 1218 dots | 5 |
> | 2 | 17-24 | 3 | 1 | 406 x 203 dots | 1 |

## Show Text Fields

Command: **ZPL Atlas: Show Text Fields**

Lists every text field in file order with the label it belongs to, the line of its data, its position (x,y from ^FO or ^FT), its font (the ^A parameters) and its text. Field data comes from ^FD, ^FV or ^SN.

Example (sample file):

> # Text Fields
>
> | Label | Line | Position | Font | Text |
> | ---: | ---: | --- | --- | --- |
> | 1 | 7 | 70,80 | 0N,48,48 | ACME WAREHOUSE |
> | 1 | 8 | 70,150 | 0N,30,30 | Ship to: Example Retail, Dock 4 |
> | 1 | 9 | 70,200 | 0N,30,30 | Order 10023 / Box 3 of 5 |
> | 1 | 14 | 70,1000 | 0N,28,28 | Handle with care |
> | 2 | 21 | 20,20 | 0N,30,30 | Shelf B-12 |
> | 2 | 23 | 450,20 | 0N,24,24 | off the label |

## Show Label Structure Check

Command: **ZPL Atlas: Show Label Structure Check**

Checks the structure of the file and lists each problem with its line: a label that is not closed with ^XZ, a ^XZ without a ^XA, field data that is not closed with ^FS, and ^ commands outside a label.

Example (sample file):

> # Label Structure Check
>
> No problems found.

## Show Barcode Check (Pro)

Command: **ZPL Atlas: Show Barcode Check** (Pro; part of the 14-day trial)

Lists every barcode field with its label, line, position, barcode type and data. EAN-13, EAN-8 and UPC-A data is checked for its length and check digit (the GS1 mod-10 rule; when the check digit is left out, the report says which one the printer will add), QR Code data for its error-correction prefix, and Code 39 data for characters it cannot hold.

Example (sample file):

> # Barcodes
>
> | Label | Line | Position | Type | Data | Check |
> | ---: | ---: | --- | --- | --- | --- |
> | 1 | 10 | 70,280 | Code 128 | \>;0950600013435210023 | ok |
> | 1 | 11 | 70,480 | QR Code | https\:\/\/example.test/track/10023 | ok |
> | 1 | 12 | 420,500 | EAN-13 | 4006381333932 | wrong check digit \(expected 1\) |
> | 1 | 13 | 70,760 | Data Matrix | LOT-2207-0001 | ok |
> | 2 | 22 | 20,70 | Code 39 | BIN-B12 | ok |

## Show Layout Check (Pro)

Command: **ZPL Atlas: Show Layout Check** (Pro; part of the 14-day trial)

Gives the size of each label in dots and in millimetres at 203 and 300 dpi (from ^PW and ^LL), and lists every field whose position lies outside the print width or the label length.

Example (sample file):

> # Layout Check
>
> Label 1: 812 x 1218 dots = 101.6 x 152.4 mm at 203 dpi, 68.7 x 103.1 mm at 300 dpi.
>
> Label 2: 406 x 203 dots = 50.8 x 25.4 mm at 203 dpi, 34.4 x 17.2 mm at 300 dpi.
>
> | Label | Line | Position | Problem |
> | ---: | ---: | --- | --- |
> | 2 | 23 | 450,20 | x 450 is outside the print width 406 |
