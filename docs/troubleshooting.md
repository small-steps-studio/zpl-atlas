# Troubleshooting

## The report says the file is not valid

ZPL Atlas reads commands that start with ^ or ~ and labels that run from ^XA to ^XZ. A file without ^XA is reported as containing no ZPL labels. Labels that use a changed command prefix (^CC or ~CC) are not supported. Field data is shown as written; hexadecimal escapes after ^FH are not decoded.

## The file is too large

Reports read files up to the size set in `zplAtlas.maxFileSizeMB` (50 MB by default and at most). VS Code passes files only up to 50 MB to extensions, so a larger file cannot be read by any extension: split it, or save a shorter one.

## The preview does not open

The report always opens as a Markdown document. If the preview stays closed, set `zplAtlas.openReportsAsPreview` to true and check that the built-in Markdown extension is enabled.

## Pro or the trial does not unlock

Run **ZPL Atlas: Show Licence Status**. It tells whether a key is stored, whether it was checked, and how many trial days are left. Details are in [licence.md](licence.md).

## Something else

Run **ZPL Atlas: Report A Problem**. It copies a diagnostics block (versions, settings, licence state; no file contents) and opens the issues page.
