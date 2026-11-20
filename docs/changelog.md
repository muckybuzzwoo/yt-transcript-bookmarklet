# Changelog

## 0.4.1 – 2026-11-20
- Ad wait shown as a yellow box ("⏳ An ad is playing. The transcript loads automatically when it ends.") instead of a grey status line.

## 0.4.0 – 2026-11-20
- Track names as endonyms (Deutsch, Français, 日本語) instead of YouTube's localized names.
- Uploaded and auto-generated tracks grouped (only if both exist); no more "(auto-generated)" suffix per entry.
- Original language marked `· original` and listed first; ASR of dubbed audio marked `· dubbed`.
- Dubbed tracks are never preselected; falls back to the original language.
- Project set up: build script, install page template, docs.

## 0.3.0 – 2026-11-20
- UI and install page in English.
- Browser language preselected (`navigator.languages`, uploaded before auto-generated).
- Option "Video description" (default off), placed after the title.
- Waits for running ads (max. 2 min) instead of failing.

## 0.2.0 – 2026-11-20
- CJK/Thai: cues joined without spaces; stats in characters.

## 0.1.0 – 2026-11-20
- First version: fetch chain (timedtext → PO token → transcript panel), track selection, paragraphs at speech pauses /
  lines / block, timestamps, chapters, tag removal, header, preview, copy, .txt/.md download. German UI.
