# Decisions

Newest last. Format: decision – reason. All from 2026-11-20 unless dated otherwise.

1. **Bookmarklet, not extension** – zero install friction, works in any Chromium browser and Firefox, no store review. Trade-off: no auto-update; users re-drag after changes.
2. **Fetch chain timedtext → PO token → transcript panel** – direct timedtext is mostly empty (token required). Capturing the player's own token (approach also used by clipizo.com's SRT bookmarklet) is the most reliable path; panel endpoint as last resort.
3. **Transcript, not SRT** – output is prose with paragraphs; timing granularity only as optional timestamps.
4. **Default layout: paragraphs at speech pauses** – readable and LLM-friendly; alternatives: one line per cue, single block.
5. **Outputs: .txt, .md, clipboard, preview** – md adds metadata list, chapter headings and timestamp jump links.
6. **Scope: watch pages + Shorts (+ live replays)** – no playlist batch (fragile, throttled).
7. **Only existing tracks, no machine translation** – `tlang` is stripped; translations would be unverifiable quality.
8. **CJK/Thai joined without spaces; stats in characters** – inserting spaces between cues is wrong in those scripts.
9. **UI and install page in English.**
10. **Browser language preselected** – iterate `navigator.languages`; exact region before base language; uploaded before auto.
11. **Video description as option, default off** – placed after the title / metadata, before the transcript.
12. **Wait for ads instead of failing** – up to 2 min with countdown; then capture the token automatically.
13. **Endonyms instead of YouTube's track names** – YouTube localizes names to the UI language; endonyms (Deutsch, Français, 日本語) are stable and recognizable. Source: `Intl.DisplayNames`, no network.
14. **Group instead of suffix** – "(auto-generated)" on every entry is noise. Uploaded / Auto-generated as `<optgroup>`, only when both kinds exist. Export header still states "(auto-generated)".
15. **Mark `original` and `dubbed`** – on dubbed videos ASR captions of dubbed languages transcribe machine audio. Original listed first.
16. **Never preselect a `dubbed` track** – if the browser language only exists as dubbed ASR, preselect the original language instead. Manual selection still possible.
17. **Docs in English, MIT license** – repo is public-ready.
