# 2026 limits and warning thresholds

The script enforces these. The template's cell comments are out of date for several values — these are the verified 2026 limits.

| Field | Hard max (error) | Warn over | Why warn |
|-------|------------------|-----------|----------|
| Campaign / Ad Set / Ad name | 35 chars | — | Meta truncates name in reports |
| Title (Headline) | 40 chars | 27 chars | Mobile Feed truncates at 27 |
| Body (Primary text) | 2,200 chars | 125 chars | "See more" link appears past 125 on mobile |
| Link Description | 200 chars | 30 chars | Often hidden on mobile Feed/Stories/Reels anyway |
| Import file (`output.txt`) | ~2,000,000 bytes | — | Meta's parser limit |

Other format rules the script enforces:

- Currency cells: number with up to 2 decimal places, no symbol. Examples: `50`, `50.00`, `0.05`. Rejected: `$50`, `50.001`.
- Date cells (`Campaign Start Time`, `Ad Set Time Start`, etc.): `MM/DD/YY HH:MM`. Example: `06/01/26 09:00`.
- Status enum: `ACTIVE`, `PAUSED`, `ARCHIVED`, `DELETED` (uppercase).
- Placements (Publisher Platforms, Facebook Positions, etc.): lowercase snake_case from VALIDATION sheet (e.g. `facebook,instagram`, `feed,story,reels`).
- Boolean cells (e.g. `Campaign Is Using L3 Schedule`): `TRUE` / `FALSE`.

## Geo-required compliance columns

When `Special Ad Categories = financial_products_services` and the campaign targets one of these countries, additional columns become required (the script does not auto-fill them; provide via brief):

| Country | Required columns |
|---------|------------------|
| Taiwan | `Beneficiary (financial ads in Taiwan)`, `Payer (financial ads in Taiwan)`, `Advertiser (Taiwan)`, `Payer (Taiwan)` |
| Australia | `Advertiser (financial ads in Australia)`, `Payer (financial ads in Australia)` |
| Singapore | `Advertiser (Singapore)`, `Payer (Singapore)` |
| India | `Advertiser (securities ads in India)`, `Payer (securities ads in India)` |
| Selected locations | `Beneficiary (selected locations)`, `Payer (selected locations)` |

## File encoding

`output.txt`:
- UTF-16 Little-Endian
- Byte Order Mark `0xFFFE` at the start
- `\t` (tab) field separator
- `\r\n` line endings

This matches Excel's "Save As → Unicode Text" output bit-for-bit. Anything else (UTF-8, plain CSV, comma separators) will fail Meta's parser.
