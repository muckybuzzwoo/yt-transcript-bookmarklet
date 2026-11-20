# CLAUDE.md – yt-transcript-bookmarklet

A single-file browser bookmarklet that downloads an existing YouTube caption track as a readable
transcript (.txt / .md / clipboard). Runs on youtube.com watch pages, Shorts and live replays.

## Layout

| Path | Role |
|---|---|
| `src/yt-transcript.js` | The bookmarklet, readable. **Single source of truth.** |
| `site/index.template.html` | Install page. Placeholders: `{{BOOKMARKLET_HREF}}`, `{{VERSION}}`, `{{REPO_URL}}` |
| `scripts/build.mjs` | Minifies (terser), percent-encodes, round-trip + parse check, renders the page |
| `dist/` | Generated, git-ignored: `yt-transcript.min.js`, `bookmarklet.txt`, `index.html` |
| `docs/` | Architecture, YouTube internals, decisions, testing, backlog, changelog |

## Commands

```
npm install        # once
npm run check      # syntax check of src
npm run build      # check + build into dist/
```

Dev environment: Windows 11 native (no WSL), Node ≥ 18.

## Workflow for changes

1. Edit `src/yt-transcript.js`.
2. `npm run build`.
3. Test live: open a YouTube video, open DevTools console, paste the content of `dist/yt-transcript.min.js`, press Enter.
   Run the matrix in `docs/testing.md` that is relevant to the change.
4. Update docs in the same change:
   - new observation about YouTube's data/endpoints → `docs/youtube-internals.md` (with date)
   - product/technical decision → `docs/decisions.md`
   - user-visible change → `docs/changelog.md` + bump `version` in `package.json`
   - open questions / ideas → `docs/backlog.md`
   - install page text, if behavior described there changes → `site/index.template.html`

## Hard constraints

- **Trusted Types:** youtube.com enforces them. Never assign `innerHTML`/`outerHTML`, never use `eval`-like sinks. Build DOM with `createElement`/`textContent` (helper `h()`).
- **Self-contained:** no external scripts, no requests to hosts other than youtube.com (same-origin `fetch`).
- **No machine translation:** never set `tlang` (it is actively stripped). Only tracks that exist.
- **UI language:** English. Track names are endonyms from `Intl.DisplayNames`, not YouTube's localized names.
- **Don't break the user's player state:** captions are toggled only to capture the PO token and restored afterwards.
- **localStorage key** `ytTranscriptBM` holds settings; keep new settings backward compatible (defaults in `DEF`).
- Bookmarklet size: currently ~23 KB encoded. Browsers accept this, but keep an eye on growth.

## Fragile parts (check first when it breaks)

YouTube's internal formats change without notice. See `docs/youtube-internals.md`. The most likely breakages:
PO token capture (`/api/timedtext` + `pot=`), `ytInitialPlayerResponse` extraction from the watch HTML,
the audio track ID suffix convention (`.4` original), `get_transcript` response shape.
