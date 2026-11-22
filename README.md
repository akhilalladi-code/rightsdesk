# RightsDesk

**A local-first creative asset rights and attribution register.** Keep source links, creator details, license references, recorded permitted uses, expiry dates and credit wording together before artwork goes to a client or channel.

RightsDesk is designed for freelance designers, small studios, marketing teams and creators who reuse stock images, fonts, icons, music, video and templates across projects.

## Why this project

A visual asset can look ready while its usage terms are scattered across a download page, invoice, email or license PDF. RightsDesk gives those details one searchable home. It complements export preflight tools: it tracks provenance and recorded rights information rather than checking image dimensions, PDF print specifications or visual differences.

## Features

- Register images, fonts, icons, video, audio, templates and other creative assets.
- Record creator, source URL, license category, proof/terms URL and acquisition date.
- Record permitted-use notes for commercial work, social media, print, web, paid advertising and modification.
- Store exact attribution wording and copy it when needed.
- Track manually verified, needs-review and restricted states; expired dates are surfaced separately.
- Dashboard counts for total assets, review gaps, expiries within 30 days and attribution text.
- Search and filter by status and asset type.
- Export the register as JSON or CSV and generate an attribution report in Markdown.
- Import a versioned JSON backup to restore or replace the current register.
- Responsive interface; no account, backend, API key or runtime package dependencies.

## Quick start

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/akhilalladi-code/rightsdesk.git
cd rightsdesk
npm run dev
```

Open <http://127.0.0.1:4174>.

You can also serve the folder with another static HTTP server, for example:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## How to use

1. Select **Add asset** and enter a descriptive asset name.
2. Add the original source and a direct link to the license, receipt or permission record where possible.
3. Record the creator, license category, dates, permitted-use notes and required credit wording.
4. Leave the status at **Needs review** until you have checked the original terms. Mark it verified only after your own review.
5. Use search and filters to find assets that need attention.
6. Export JSON regularly for backup. Export CSV for a spreadsheet or the Markdown attribution report for a project handoff.

## Data and privacy

- All asset records are stored in this browser's `localStorage`.
- No asset files are uploaded. RightsDesk stores URLs and text notes only.
- There is no account, analytics integration, database or application API.
- Browser storage is specific to this browser profile and device. Clearing site data can delete the register; export JSON backups regularly.
- Imported backups are limited to 5 MB in the interface and 5,000 records in the data normalizer.
- The interface loads DM Sans, Manrope and DM Mono from Google Fonts; system font fallbacks remain available.

## Quality checks

```bash
npm run check
npm test
```

Tests use Node's built-in test runner and require no third-party test dependencies.

## Important limitations

RightsDesk is a record-keeping aid, **not legal advice and not a license verifier**. A selected license label does not establish that a use is permitted. License terms can vary by asset, seller, plan, jurisdiction and date. “Royalty-free,” “client supplied” and “commercial” are not blanket permissions. Check the original terms, proof of purchase or written permission, and any restrictions on seats, channels, territory, audience, modification, redistribution and duration. RightsDesk does not fetch URLs, parse license documents, determine legal rights or certify compliance.

Expiry alerts are date-based reminders only. They do not renew a license or establish that a license is valid until that date. The user is responsible for recording accurate information and deciding when an asset is approved for use.

## License

MIT. See [LICENSE](LICENSE).
