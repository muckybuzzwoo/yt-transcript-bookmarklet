# Backlog

## Next

- [ ] **GitHub Pages for the install page**
  1. Create the GitHub repo, push.
  2. Set `"repository": "https://github.com/<user>/yt-transcript-bookmarklet"` in `package.json` (feeds `{{REPO_URL}}` on the page).
  3. Add `.github/workflows/pages.yml`: on push to `main` → `actions/checkout`, `actions/setup-node` (Node 22, npm cache),
     `npm ci`, `npm run build`, `actions/configure-pages`, `actions/upload-pages-artifact` with `path: dist`, `actions/deploy-pages`.
     Permissions: `pages: write`, `id-token: write`, `contents: read`; environment `github-pages`.
  4. Repo → Settings → Pages → Source: **GitHub Actions**.
  5. Commit `package-lock.json` (needed for `npm ci`).
  6. Link the Pages URL in `README.md`.
  7. Check that dragging the button from the Pages site into the bookmarks bar works (Chrome, Edge, Firefox).

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
