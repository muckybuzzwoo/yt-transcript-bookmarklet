# YouTube internals (observed)

Observations from live tests. YouTube changes these without notice – always note the date.
**Last verified: 2026-11-20** (Chromium-based browser, logged-in session, German UI).

## Caption download (`/api/timedtext`)
- `captionTracks[].baseUrl` + `fmt=json3` returns **HTTP 200 with an empty body** for most videos: a proof-of-origin token is required.
- The player's own request contains `pot=<token>` (plus `potc`, `c`, `cver`, …). It appears in `performance.getEntriesByType('resource')`.
- The token is bound to the **video**, not the track: merging the player's params into the baseUrl of *any* other track of the same video works
  (verified: German manual, English ASR, Japanese manual).
- The player only requests captions when they are on. Toggling `player.toggleSubtitles()` (API on `#movie_player` and `#shorts-player`) triggers the request.
  `player.isSubtitlesOn()` reports the state.
- **During an ad** the player requests captions for the ad, not for the video (`v=` differs). The player element has the class `ad-showing`.
- Resource timing buffer defaults to 250 entries and fills quickly on YouTube → `setResourceTimingBufferSize(5000)` + `PerformanceObserver`.
- JSON3: `events[]` with `tStartMs`, `dDurationMs`, `segs[]` (`utf8`, `tOffsetMs`). ASR events have one seg per word; line-wrap events contain only `"\n"`.
- ASR event durations overlap the next event → word end times are unreliable; cap at 800 ms for pause detection.
- `tlang=<code>` would request machine translation – intentionally stripped.

## Player response
- Watch HTML contains `var ytInitialPlayerResponse = {...};` and `var ytInitialData = {...};`.
- `captionTracks[]`: `baseUrl`, `languageCode`, `kind: "asr"` for auto-generated, `name` (localized to the **YouTube UI language**, e.g. "Deutsch (automatisch erzeugt)"), `vssId` (`a.de` for ASR, `.de` for uploaded), `trackName` (usually empty).
- `videoDetails.shortDescription` holds the full description (despite the name). `videoDetails.title` is the **original** title, the page shows a translated one.
- `microformat.playerMicroformatRenderer.publishDate` exists in the HTML response, not always in `getPlayerResponse()`.

## Audio tracks (multi-language / dubbed videos)
Source: `streamingData.adaptiveFormats[].audioTrack` = `{ id, displayName, audioIsDefault, isAutoDubbed? }`.

| ID suffix | Meaning | Example |
|---|---|---|
| `.4` | Original audio | `en-US.4`, displayName "Englisch (US) (Original)" |
| `.3` | Human dub (no `isAutoDubbed`) | 3Blue1Brown `aircAruvnKk`: `de.3`, `ar.3`, … |
| `.10` | AI dub, `isAutoDubbed: true` | Flowizo `zlqjT3HGwSE`: `de-DE.10`, `hi.10`, … |

- `audioIsDefault` follows the **viewer's** language (it pointed to the German dub) → not usable to find the original.
- On AI-dubbed videos YouTube offers **ASR captions for every dubbed language** – these transcribe the machine-dubbed audio.
- `captions.playerCaptionsTracklistRenderer.audioTracks[].captionTrackIndices` lists all tracks for every audio track → no usable mapping; the bookmarklet maps by language.

## Chapters
- `chapterRenderer` (`title`, `timeRangeStartMillis`) in `ytInitialData` (player bar markers). Chapter titles are localized to the UI language.

## Transcript panel (`get_transcript`) – fallback, not verified live
- `POST /youtubei/v1/get_transcript` with `{ context: ytcfg.get('INNERTUBE_CONTEXT'), params }`, params from `getTranscriptEndpoint`.
- Segments: `transcriptSegmentRenderer` (`startMs`, `endMs`, `snippet`). Language menu: `subMenuItems[]` with `reloadContinuationData.continuation`.

## Page environment
- youtube.com enforces **Trusted Types** → `innerHTML` assignments throw.
- Bookmarklets run despite the page CSP (Chrome, Edge, Firefox ≥ 69).
- EU: a consent page (`consent.youtube.com`) can precede the first visit; not encountered in tests.
  In a fresh automated browser (2026-11-20) it appears as a dialog on the watch page instead ("Alle ablehnen").
- Automated browsers (2026-11-20): Playwright Firefox 152 has `navigator.webdriver = true`. `/api/timedtext` then returns
  HTTP 200 with an empty body, even for the player's own URL with `pot=`. Playwright with installed Chrome 157 (headed) works normally.
- A `javascript:` URL whose result is a Promise does not replace the page (Chrome 157, Firefox 152). No `void` prefix needed.
