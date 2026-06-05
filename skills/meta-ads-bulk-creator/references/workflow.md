# Upload workflow

## Import in Ads Manager

1. Go to [adsmanager.facebook.com](https://adsmanager.facebook.com).
2. Top right: **Import & Export → Import Ads** (legacy: Options → Import ads).
3. Choose **Upload File**, select `output/output.txt` (UTF-16 LE, tab-separated). Do NOT upload `output.xlsx` — Meta's parser expects the `.txt` form.
4. Meta prompts for image/video files. Drag the contents of your `--images` folder (loose files or zipped — both work). Filenames must match the `Image File Name` column exactly (case-sensitive).
5. Wait for Meta's validation summary. Warnings are advisory; errors block.
6. Drafts appear in Ads Manager. Review settings, previews, audiences.
7. Click **Publish** to push live. Until then, nothing spends.

## Hard constraints

- Max import file size: ~2 MB. Split into multiple uploads if `output.txt` exceeds this.
- Don't delete or rename columns in `output.xlsx` if you edit it before exporting again — Meta needs all 143.
- Image filenames are case-sensitive. `Hero_A.jpg` and `hero_a.jpg` are different.
- Status correlation: an `ACTIVE` ad inside a `PAUSED` ad set will not run. Default state is `PAUSED` everywhere — toggle on after review.

## Editing existing campaigns

To update existing objects instead of creating new ones:
1. Export the existing ads from Ads Manager (Import & Export → Export ads).
2. Modify the cells you want to change. Keep `Campaign ID`, `Ad Set ID`, `Ad ID` populated — that's what tells Meta to update vs create.
3. Save as Unicode .txt and re-import.

## Common reasons imports fail

- Header row missing or columns out of order → re-run `extract_columns.py` and rebuild.
- File saved as plain `.csv` or `.txt` (UTF-8) instead of Unicode → Meta's parser won't read non-UTF-16-LE.
- Image filename case mismatch.
- `Special Ad Categories` left blank when account is in a regulated region.
- Currency cell contains a `$` or `€` symbol.
- Date in a non-`MM/DD/YY HH:MM` format.

## Reference

- [Meta: How to bulk upload and import ads](https://www.facebook.com/business/help/122918328469908)
- [Meta: Columns in the import/export template](https://www.facebook.com/business/help/1471948569691450)
- [Meta: Troubleshoot bulk import issues](https://en-gb.facebook.com/business/help/216243691909235)
