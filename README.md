# YouTube Transcript Bookmarklet

A bookmarklet that turns an existing YouTube caption track into a readable transcript – as `.txt`, `.md`, or straight to the clipboard.
Works on watch pages, Shorts and live replays. No extension, no server, nothing leaves your browser except requests to youtube.com.

## Features
- All existing caption tracks, named in their own language (Deutsch, Français, 日本語 …).
- On dubbed videos the original language is marked and preselected; auto-captions of dubbed audio are marked `dubbed`.
- Your browser language is preselected when it exists as a real (non-dubbed) track.
- Layouts: paragraphs at speech pauses (adjustable), one line per segment, single block.
- Options: timestamps (jump links in Markdown), chapters as headings, remove `[Music]` etc., header with title/channel/date/URL, video description.
- Waits for running ads, restores your caption setting afterwards.

## Install
**Install page:** _GitHub Pages URL – see docs/backlog.md_

Or build locally and open the page:

```
npm install
npm run build
```

Open `dist/index.html`, drag the red button into your bookmarks bar.

## Use
Open a video on YouTube, click the bookmark. A panel opens with track, layout, options, preview, **Copy**, **.txt**, **.md**.

After an update, delete the old bookmark and drag the new one – bookmarklets don't update themselves.

## How it works
YouTube only serves captions with a proof-of-origin token. The bookmarklet briefly switches captions on, reads the token from the
player's own request, and uses it for all tracks of the video. Details: [docs/architecture.md](docs/architecture.md),
[docs/youtube-internals.md](docs/youtube-internals.md).

## Limits
Relies on undocumented YouTube internals – it can break whenever YouTube changes them. No machine translation by design.
Not affiliated with YouTube or Google.

## Development
See [CLAUDE.md](CLAUDE.md) and [docs/](docs/): decisions, testing matrix, backlog, changelog.

## License
MIT
