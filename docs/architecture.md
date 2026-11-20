# Architecture

Everything lives in one async IIFE in `src/yt-transcript.js`. Sections in source order:

## 1. Guard and video ID
- Only runs on `*.youtube.com`. Video ID from `/watch?v=`, `/shorts/<id>` or `/live/<id>`.
- Removes an existing panel (`#ytTranscriptBM`) so a second click re-opens it for the current video (SPA navigation).

## 2. Settings
- Defaults in `DEF`, merged with `localStorage['ytTranscriptBM']`, saved on every change.
- Keys: `lang` (last choice, `"de"` or `"de:asr"`), `mode` (`para|lines|block`), `pause` (s), `maxLen` (chars),
  `tstamp`, `chap`, `clean`, `head`, `desc` (booleans), `fmt` (`txt|md`, preview/copy format).

## 3. Video data
- `fetch('/watch?v=<id>')` (same origin, with cookies) and extract `ytInitialPlayerResponse` and `ytInitialData`
  by brace matching (`extractJSON`). Fresh fetch avoids stale data after SPA navigation.
- Fallback: `player.getPlayerResponse()` of the live player if the fetch fails or returns another video.
- Metadata: title, channel, publish date, duration, description (`videoDetails`, `microformat`).
- Caption tracks: `captions.playerCaptionsTracklistRenderer.captionTracks`.
- Chapters: all `chapterRenderer` objects in `ytInitialData`; fallback `macroMarkersListItemRenderer` (key moments).
- `getTranscriptEndpoint.params` for the panel fallback.

## 4. Track labels
- Label = endonym via `Intl.DisplayNames([code]).of(code)` (+ YouTube `trackName` if set), duplicates get `(code)`.
- Tags from audio tracks (`streamingData.adaptiveFormats[].audioTrack`), see youtube-internals.md:
  `original` = same base language as the original audio track; `dubbed` = auto-captions in a language that only exists as dubbed audio.
- Select: original first, then alphabetical; `<optgroup>` Uploaded / Auto-generated only if both kinds exist.
- Preselection order (`pick`): browser languages (uploaded → auto, never `dubbed`) → original (uploaded → auto) → last choice (not dubbed) → first uploaded → first.

## 5. Fetch chain (`load`)
1. `timedtext` baseUrl with `fmt=json3` (works for some videos without token).
2. If empty: `capturePot` – wait for ads to end (max 2 min), toggle captions via player API (`toggleSubtitles`, fallback: CC button),
   observe resource timing for a `/api/timedtext` request with `pot=` and matching `v=`, restore caption state.
   Merge all params from that URL that the track's baseUrl lacks (pot, potc, c, cver, …) and fetch again. Token is cached per page run.
3. If still empty: `get_transcript` (innertube, anonymous) with the panel's params; switch language via the panel's language menu continuation.
- Results cached per track index.

## 6. Formatting (`build`)
- Tokens from JSON3: one per segment (`segs[].utf8`) with start `t`, end `e`, `cue` (first seg of an event), `asr`.
- Gap before a token: ASR → start minus (previous start + min(word duration, 800 ms)); uploaded → start minus previous cue end.
- Paragraph break (`para`): gap ≥ pause and ≥ 60 chars, or sentence end and ≥ maxLen, or ≥ 2×maxLen.
  `lines`: break at each cue. `block`: only at chapters.
- Chapters force a break and insert a heading block.
- CJK/Thai etc. (`ja|zh|yue|th|lo|km|my`): join without spaces; stats count characters.
- Optional removal of `[…]` tags and ♪.

## 7. Rendering (`render`)
- txt: optional header (title, channel · date, URL, track), optional description block, `=== Chapter ===`, `[mm:ss]` stamps.
- md: `# Title`, metadata list, optional `## Description`, `---`, `## Chapter`, timestamps as `[mm:ss](url&t=Ns)` links.
- Download via Blob + `<a download>`; clipboard via `navigator.clipboard`, fallback `execCommand('copy')`.

## 8. UI
- Fixed, draggable panel, colors follow YouTube's dark/light (`html[dark]`). Built with `h()` (no innerHTML, Trusted Types).
- `update()` is sequence-guarded (`seq`) so fast option changes don't render stale results.
