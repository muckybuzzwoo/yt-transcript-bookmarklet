# Backlog

## Next

- [x] **GitHub Pages for the install page** (2026-11-20): repo, `.github/workflows/release.yml`, Pages source "GitHub Actions",
  tag rule `v*` on the `github-pages` environment, README link. See decision 18.
- [ ] Check that dragging the button from the Pages site into the bookmarks bar works (Chrome, Edge, Firefox).

## Verify (open test cases, see testing.md)
- [x] Optgroup view on a video with uploaded + ASR tracks (2026-11-20)
- [x] Download and copy buttons, file names with special characters (2026-11-20, Chrome)
- [ ] Transcript panel fallback (`get_transcript`) – force it by temporarily disabling steps 1–2
- [x] Caption download in a real Firefox (2026-11-20, manual; automated Firefox is blocked by YouTube)
- [ ] Video without captions, SPA navigation

## Ideas
- Version shown in the panel header (helps users notice an outdated bookmark).
- "Update available" hint: compare against a version file on GitHub Pages (needs a cross-origin fetch – check CSP).
- Remember panel position.
- Option: strip filler words in ASR ("äh", "um").
- Playlist batch (out of scope so far: fragile, rate-limited).
