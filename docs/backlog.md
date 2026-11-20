# Backlog

## Next

- [x] **GitHub Pages for the install page** (2026-11-20): repo, `.github/workflows/release.yml`, Pages source "GitHub Actions",
  tag rule `v*` on the `github-pages` environment, README link. See decision 18.
- [x] Check that dragging the button from the Pages site into the bookmarks bar works (2026-11-20, manual; Edge not tried).

## Verify (open test cases, see testing.md)
- [x] Optgroup view on a video with uploaded + ASR tracks (2026-11-20)
- [x] Download and copy buttons, file names with special characters (2026-11-20, Chrome)
- [ ] Transcript panel fallback (`get_transcript`) – force it by temporarily disabling steps 1–2
- [x] Caption download in a real Firefox (2026-11-20, manual; automated Firefox is blocked by YouTube)
- [ ] Video without captions, SPA navigation
- [ ] Yellow ad box (v0.4.1) with a real ad – so far only tested with a faked `ad-showing` class
- [ ] Release workflow on a real tag push (next release): release created, notes from changelog, Pages updated.
  Only the manual Pages run from `main` is tested so far.

## Ideas
- Version shown in the panel header (helps users notice an outdated bookmark).
- "Update available" hint: compare against a version file on GitHub Pages (needs a cross-origin fetch – check CSP).
- Remember panel position.
- Option: strip filler words in ASR ("äh", "um").
- Playlist batch (out of scope so far: fragile, rate-limited).
