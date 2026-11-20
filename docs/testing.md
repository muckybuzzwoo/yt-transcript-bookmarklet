# Testing

No automated tests – the bookmarklet depends on live YouTube pages. Test manually after every change.

## How to run without installing
1. `npm run build`
2. Open a YouTube video, DevTools → Console.
3. Paste the content of `dist/yt-transcript.min.js`, Enter. (Chrome may ask you to type `allow pasting` first.)
4. To reset settings: `localStorage.removeItem('ytTranscriptBM')`.

## Test videos

| ID | Why |
|---|---|
| `aircAruvnKk` (3Blue1Brown, neural networks) | 31 uploaded tracks + English ASR, 12 chapters, human dubs (`.3`), long description |
| `zlqjT3HGwSE` (Clipizo, Flowizo plugin) | Only ASR tracks, 20 AI dubs (`.10`), original `en-US.4`, chapters |
| any Short with German ASR (`/shorts/…`) | Shorts player (`#shorts-player`), cold start |

## Matrix

| # | Case | Expected | Last result |
|---|---|---|---|
| 1 | Watch page, captions already loaded | Loads via `timedtext+pot` | ✅ 2026-11-20 |
| 2 | Cold start (no caption request yet) | Captions toggled briefly, state restored | ✅ 2026-11-20 (Short) |
| 3 | Ad running at click | Yellow box "⏳ An ad is playing…" with seconds, then loads | ✅ 2026-11-20 (38 s ad, v0.4.0 grey line); v0.4.1 yellow box: see changelog |
| 4 | Switch track (uploaded → ASR → other language) | All load with the same token | ✅ 2026-11-20 |
| 5 | Japanese track | No spaces between cues, "characters" stat | ✅ 2026-11-20 |
| 6 | Preselection, browser `de` | 3B1B: "Deutsch"; Flowizo: "English · original" (not the German dub) | ✅ 2026-11-20 |
| 7 | Labels on AI-dubbed video | Endonyms, `English · original` first, others `· dubbed`, no groups | ✅ 2026-11-20 |
| 8 | Video with uploaded + ASR tracks | Two optgroups Uploaded / Auto-generated | ✅ 2026-11-20 (3B1B: Uploaded 30, Auto-generated 1; Chrome + Firefox, automated) |
| 9 | Chapters on/off, timestamps on/off | Headings / stamps appear and disappear | ✅ 2026-11-20 |
| 10 | Description option, md | `## Description` after metadata | ✅ 2026-11-20 |
| 11 | Downloads .txt / .md, Copy | Files named `<title> [<lang>].<ext>` | ✅ 2026-11-20 (Chrome, automated: `?` and `\|` removed from the name, Copy fills the clipboard) |
| 12 | Transcript panel fallback | Loads when timedtext fails | ⚠️ never triggered |
| 13 | Video without captions | "This video has no captions." | ⚠️ not tested |
| 14 | Firefox | Works | ✅ 2026-11-20 real Firefox: bookmark dragged from `dist/index.html`, captions load (manual). Playwright Firefox 152: panel, track list, preselection OK, captions blocked (see below) |
| 15 | SPA navigation to another video, click again | Panel shows the new video | ⚠️ not tested explicitly |
| 16 | Click as a bookmark (`javascript:` URL) | Page stays, panel opens | ✅ 2026-11-20 Chrome 157 + Firefox 152: the Promise result does not replace the page (control link with a string result does) |

## Automated runs (playwright-cli)
- Run headed (`--headed`). Headless Chrome never starts the player (state `-1`), so no token and no captions.
- Cookie banner: click "Alle ablehnen" / "Reject all" first.
- Inject `dist/yt-transcript.min.js` with `page.evaluate(code)`. This equals a console paste, not a bookmark click (case 16 covers that).
- Playwright Firefox sets `navigator.webdriver = true`. YouTube then returns empty captions, also to its own player. Only a real Firefox can test the download path.
