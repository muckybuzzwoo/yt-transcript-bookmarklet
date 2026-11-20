/* YouTube Transcript bookmarklet – source
 * Downloads an existing caption track of a video as a readable transcript
 * (.txt / .md / clipboard). Runs on youtube.com (watch pages, Shorts, live replays).
 * Fetch chain: timedtext direct → timedtext with the player's PO token → transcript panel (get_transcript).
 */
(async () => {
  const NS = 'ytTranscriptBM';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const say = m => alert('YouTube Transcript: ' + m);

  if (!/(^|\.)youtube\.com$/.test(location.hostname)) return say('Please run this on a YouTube video page.');
  const vid = (() => {
    const u = new URL(location.href);
    if (u.pathname === '/watch') return u.searchParams.get('v');
    const m = u.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})/);
    return m && m[1];
  })();
  if (!vid) return say('No video detected – open a watch or Shorts page.');
  document.getElementById(NS)?.remove();

  /* ---------- Helpers ---------- */
  const extractJSON = (src, marker) => {
    let i = src.indexOf(marker);
    if (i < 0) return null;
    i = src.indexOf('{', i);
    let d = 0, s = false, e = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j];
      if (s) { if (e) e = false; else if (c === '\\') e = true; else if (c === '"') s = false; continue; }
      if (c === '"') s = true;
      else if (c === '{') d++;
      else if (c === '}' && --d === 0) { try { return JSON.parse(src.slice(i, j + 1)); } catch (_) { return null; } }
    }
    return null;
  };
  const findAll = (o, key, out = [], seen = new Set()) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return out;
    seen.add(o);
    if (Array.isArray(o)) for (const x of o) findAll(x, key, out, seen);
    else for (const k in o) { if (k === key) out.push(o[k]); findAll(o[k], key, out, seen); }
    return out;
  };
  const txt = t => t ? (t.simpleText ?? (t.runs || []).map(r => r.text).join('')) : '';
  const ts = ms => {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
  };
  const getPlayer = () => {
    for (const sel of ['#shorts-player', '#movie_player']) {
      const p = document.querySelector(sel);
      try { if (p?.getVideoData?.()?.video_id === vid) return p; } catch (_) {}
    }
    return null;
  };

  /* ---------- Settings ---------- */
  const DEF = { lang: '', mode: 'para', pause: 1.5, maxLen: 700, tstamp: true, chap: true, clean: true, head: true, desc: false, fmt: 'txt' };
  let S = { ...DEF };
  try { Object.assign(S, JSON.parse(localStorage.getItem(NS) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(NS, JSON.stringify(S)); } catch (_) {} };

  /* ---------- Video data ---------- */
  let pr = null, idata = null;
  try {
    const html = await (await fetch('/watch?v=' + vid, { credentials: 'include' })).text();
    pr = extractJSON(html, 'ytInitialPlayerResponse = ');
    idata = extractJSON(html, 'ytInitialData = ');
  } catch (_) {}
  if (pr?.videoDetails?.videoId !== vid) {
    try { const live = getPlayer()?.getPlayerResponse?.(); if (live?.videoDetails?.videoId === vid) pr = live; } catch (_) {}
  }
  const vd = pr?.videoDetails || {};
  const meta = {
    title: vd.title || document.title.replace(/ - YouTube$/, ''),
    author: vd.author || '',
    date: pr?.microformat?.playerMicroformatRenderer?.publishDate?.slice(0, 10) || '',
    len: +vd.lengthSeconds || 0,
    desc: vd.shortDescription || txt(pr?.microformat?.playerMicroformatRenderer?.description) || '',
    url: 'https://www.youtube.com/watch?v=' + vid,
  };
  const tracks = (pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || []).map(t => ({
    url: t.baseUrl, lang: t.languageCode, asr: t.kind === 'asr', name: txt(t.name) || t.languageCode, sub: t.trackName || '',
  }));

  /* ---------- Track labels: endonyms, original vs. dubbed ---------- */
  const base = s => (s || '').toLowerCase().split(/[-_.]/)[0];
  // Audio tracks only exist on multi-language videos. Observed ID suffixes: ".4" = original,
  // ".3" = human dub, ".10" = AI dub (isAutoDubbed). audioIsDefault follows the viewer's language → useless here.
  const audio = [...new Map((pr?.streamingData?.adaptiveFormats || []).filter(f => f.audioTrack).map(f => [f.audioTrack.id, f.audioTrack])).values()];
  const nonDub = audio.filter(a => !a.isAutoDubbed);
  const origAudio = audio.length > 1 ? (audio.find(a => /\.4$/.test(a.id)) || (nonDub.length === 1 ? nonDub[0] : null)) : null;
  const origLang = origAudio ? base(origAudio.id) : '';
  const dubLangs = new Set(audio.filter(a => a !== origAudio).map(a => base(a.id)));
  const endonym = code => {
    try {
      const n = new Intl.DisplayNames([code], { type: 'language' }).of(code);
      if (n && n.toLowerCase() !== code.toLowerCase()) return n.charAt(0).toLocaleUpperCase(code) + n.slice(1);
    } catch (_) {}
    return '';
  };
  tracks.forEach(t => {
    t.label = (endonym(t.lang) || t.name.replace(/\s*\([^)]*\)\s*$/, '')) + (t.sub ? ` – ${t.sub}` : '');
    t.tag = origLang && base(t.lang) === origLang ? 'original' : t.asr && dubLangs.has(base(t.lang)) ? 'dubbed' : '';
  });
  const dupes = {};
  tracks.forEach(t => (dupes[t.asr + t.label] = (dupes[t.asr + t.label] || 0) + 1));
  tracks.forEach(t => {
    if (dupes[t.asr + t.label] > 1) t.label += ` (${t.lang})`;
    t.full = t.label + (t.asr ? ' (auto-generated)' : '') + (t.tag ? `, ${t.tag}` : '');
  });
  let chapters = findAll(idata, 'chapterRenderer').map(c => ({ t: c.timeRangeStartMillis, title: txt(c.title) }));
  if (!chapters.length) chapters = findAll(idata, 'macroMarkersListItemRenderer')
    .map(c => ({ t: (c.onTap?.watchEndpoint?.startTimeSeconds ?? -1) * 1000, title: txt(c.title) }))
    .filter(c => c.t >= 0);
  chapters = [...new Map(chapters.filter(c => c.title).map(c => [c.t, c])).values()].sort((a, b) => a.t - b.t);
  const transcriptParams = findAll(idata, 'getTranscriptEndpoint')[0]?.params;

  /* ---------- Fetch chain ---------- */
  const fetchJson3 = async u => {
    try {
      const x = new URL(u, location.origin);
      x.searchParams.set('fmt', 'json3'); x.searchParams.delete('tlang');
      const r = await fetch(x, { credentials: 'include' });
      const t = r.ok ? await r.text() : '';
      return t ? JSON.parse(t) : null;
    } catch (_) { return null; }
  };
  const fromJson3 = (j, asr) => {
    const out = [];
    for (const ev of j?.events || []) {
      const segs = (ev.segs || []).filter(s => s.utf8 && s.utf8 !== '\n');
      const st = ev.tStartMs || 0, en = st + (ev.dDurationMs || 0);
      segs.forEach((s, i) => out.push({
        t: st + (s.tOffsetMs || 0),
        e: segs[i + 1] ? st + (segs[i + 1].tOffsetMs || 0) : en,
        x: s.utf8.replace(/\n/g, ' '), cue: i === 0, asr,
      }));
    }
    return out.length ? out : null;
  };
  const findPot = list => list.map(e => e.name)
    .filter(n => n.includes('/api/timedtext') && n.includes('pot='))
    .reverse()
    .find(n => { try { return new URL(n).searchParams.get('v') === vid; } catch (_) { return false; } });
  let potCache = null;
  const capturePot = async status => {
    if (potCache) return potCache;
    let found = findPot(performance.getEntriesByType('resource'));
    if (found) return potCache = found;
    const p = getPlayer();
    if (!p) return null;
    // During an ad the player requests no captions for the actual video → wait (max. 2 min)
    const adOn = () => p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting');
    if (adOn()) {
      for (let i = 0; i < 240 && adOn(); i++) { status(`⏳ An ad is playing. The transcript loads automatically when it ends. (${Math.round(i / 2)} s)`, true); await sleep(500); }
      await sleep(1000);
    }
    status('Briefly enabling captions to capture the player token …');
    try { performance.setResourceTimingBufferSize(5000); } catch (_) {}
    const obs = new PerformanceObserver(l => { found = found || findPot(l.getEntries()); });
    try { obs.observe({ type: 'resource' }); } catch (_) {}
    const btn = document.querySelector((p.id === 'shorts-player' ? '#shorts-player ' : '#movie_player ') + '.ytp-subtitles-button');
    const isOn = () => { try { if (p.isSubtitlesOn) return !!p.isSubtitlesOn(); } catch (_) {} return btn?.getAttribute('aria-pressed') === 'true'; };
    const toggle = () => { try { if (p.toggleSubtitles) return p.toggleSubtitles(); } catch (_) {} btn?.click(); };
    const wasOn = isOn();
    if (wasOn) { toggle(); await sleep(300); }
    toggle();
    for (let i = 0; i < 24 && !found; i++) { await sleep(500); found = found || findPot(performance.getEntriesByType('resource')); }
    try { obs.disconnect(); } catch (_) {}
    if (!wasOn && isOn()) toggle();
    return potCache = found || null;
  };
  const mergePot = (base, pot) => {
    const b = new URL(base, location.origin), p = new URL(pot);
    for (const [k, v] of p.searchParams) if (!b.searchParams.has(k) && k !== 'tlang') b.searchParams.set(k, v);
    return b.href;
  };
  const getTranscript = async params => {
    try {
      const ctx = window.ytcfg?.get?.('INNERTUBE_CONTEXT');
      if (!ctx || !params) return null;
      const r = await fetch('/youtubei/v1/get_transcript?prettyPrint=false', {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx, params }),
      });
      return r.ok ? r.json() : null;
    } catch (_) { return null; }
  };
  const fromPanel = async track => {
    let res = await getTranscript(transcriptParams);
    if (!res) return null;
    const items = findAll(res, 'subMenuItems')[0] || [];
    const want = items.find(i => i.title === track.name);
    if (want && !want.selected) {
      const c = want.continuation?.reloadContinuationData?.continuation;
      res = c ? await getTranscript(c) : null;
    } else if (!want && items.length > 1) return null; // requested track not offered by the panel
    const segs = findAll(res, 'transcriptSegmentRenderer').map(s => ({
      t: +s.startMs, e: +s.endMs, x: txt(s.snippet), cue: true, asr: false,
    })).filter(s => s.x);
    return segs.length ? segs : null;
  };
  const cache = {};
  const load = async (i, status) => {
    if (cache[i]) return cache[i];
    const tr = tracks[i];
    let toks = fromJson3(await fetchJson3(tr.url), tr.asr), src = 'timedtext';
    if (!toks) {
      const pot = await capturePot(status);
      if (pot) { toks = fromJson3(await fetchJson3(mergePot(tr.url, pot)), tr.asr); src = 'timedtext+pot'; }
    }
    if (!toks) { status('Trying the transcript panel …'); toks = await fromPanel(tr); src = 'transcript panel'; }
    if (!toks) return null;
    return cache[i] = { toks, src };
  };

  /* ---------- Formatting ---------- */
  const TAG = /\[[^\]\n]{1,40}\]|♪+|♫+/g;
  const build = (toks, cjk) => {
    let list = toks.map(k => ({ ...k, x: S.clean ? k.x.replace(TAG, ' ') : k.x })).filter(k => k.x.trim());
    list.forEach((k, i) => {
      if (!i) return (k.gap = 0);
      const p = list[i - 1];
      const pend = p.asr ? p.t + Math.min(Math.max(p.e - p.t, 0), 800) : Math.min(p.e, k.t);
      k.gap = k.t - pend;
    });
    const out = [], chs = S.chap ? chapters : [];
    let cur = null, ci = 0;
    const flush = () => {
      if (cur) { cur.text = cur.text.replace(/\s+/g, ' ').replace(/\s+([,.!?;:…])/g, '$1').trim(); if (cur.text) out.push(cur); }
      cur = null;
    };
    for (const k of list) {
      while (ci < chs.length && chs[ci].t <= k.t + 300) { flush(); out.push({ h: 1, t: chs[ci].t, text: chs[ci].title }); ci++; }
      if (cur) {
        const t = cur.text.trimEnd(), len = t.length;
        let brk = false;
        if (S.mode === 'lines') brk = k.cue;
        else if (S.mode === 'para') {
          const end = /[.!?…]["'»«“”)]?$/.test(t);
          brk = (k.gap >= S.pause * 1000 && len >= 60) || (end && len >= S.maxLen) || len >= S.maxLen * 2;
        }
        if (brk) flush();
      }
      if (!cur) cur = { t: k.t, text: '' };
      cur.text += (cur.text && !cjk && !/\s$/.test(cur.text) && !/^\s/.test(k.x) ? ' ' : '') + (cjk ? k.x.trim() : k.x);
    }
    flush();
    return out;
  };
  const render = (blocks, fmt, trackName) => {
    const md = fmt === 'md';
    const sep = S.mode === 'lines' ? '\n' : S.mode === 'block' ? ' ' : '\n\n';
    const stamp = b => !S.tstamp ? '' : md ? `[${ts(b.t)}](${meta.url}&t=${Math.floor(b.t / 1000)}s) ` : `[${ts(b.t)}] `;
    let body = '', prevH = true;
    for (const b of blocks) {
      if (b.h) { body += (body ? '\n\n' : '') + (md ? `## ${b.text}` : `=== ${b.text} ===`) + (S.tstamp && !md ? ` [${ts(b.t)}]` : '') + '\n\n'; prevH = true; continue; }
      body += (prevH ? '' : sep) + stamp(b) + b.text; prevH = false;
    }
    const desc = S.desc && meta.desc.trim() ? meta.desc.trim() : '';
    const lines = md
      ? [`# ${meta.title}`, '', meta.author ? `- **Channel:** ${meta.author}` : null, `- **Video:** ${meta.url}`,
         meta.date ? `- **Published:** ${meta.date}` : null, meta.len ? `- **Duration:** ${ts(meta.len * 1000)}` : null,
         `- **Transcript:** ${trackName}`, '',
         ...(desc ? ['## Description', '', desc.replace(/\n/g, '  \n'), ''] : []), '---', '', '']
      : [...(S.head ? [meta.title, [meta.author, meta.date].filter(Boolean).join(' · ') || null, meta.url, `Transcript: ${trackName}`, ''] : []),
         ...(desc ? ['Description:', desc, '', '-'.repeat(40), ''] : []),
         ...(S.head || desc ? [''] : [])];
    return lines.filter(l => l !== null).join('\n') + body.trim() + '\n';
  };

  /* ---------- UI ---------- */
  const dark = document.documentElement.hasAttribute('dark');
  const C = dark ? { bg: '#212121', fg: '#f1f1f1', mu: '#aaa', bd: '#3f3f3f', in: '#121212', ac: '#3ea6ff' }
                 : { bg: '#fff', fg: '#0f0f0f', mu: '#606060', bd: '#d9d9d9', in: '#f8f8f8', ac: '#065fd4' };
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el) el[k] = v; else el.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
    return el;
  };
  const ctl = `font:13px Roboto,Arial,sans-serif;color:${C.fg};background:${C.in};border:1px solid ${C.bd};border-radius:6px;padding:4px 6px;`;
  const btnCss = `font:500 13px Roboto,Arial,sans-serif;color:#fff;background:${C.ac};border:0;border-radius:16px;padding:7px 14px;cursor:pointer;`;
  const row = (label, ...kids) => h('label', { style: 'display:flex;align-items:center;gap:8px;margin:6px 0;' },
    h('span', { style: `min-width:92px;color:${C.mu};` }, label), ...kids);
  const check = (key, label) => h('label', { style: 'display:flex;align-items:center;gap:6px;margin:3px 0;cursor:pointer;' },
    h('input', { type: 'checkbox', checked: !!S[key], onchange: e => { S[key] = e.target.checked; save(); update(); } }), label);

  const sel = h('select', { style: ctl + 'flex:1;min-width:0;', onchange: () => { S.lang = tracks[sel.value].lang + (tracks[sel.value].asr ? ':asr' : ''); save(); update(); } });
  // Options: original language on top, then alphabetical by endonym; grouped only if both kinds exist
  const fillTracks = () => {
    const order = tracks.map((_, i) => i).sort((a, b) =>
      (tracks[a].tag === 'original' ? 0 : 1) - (tracks[b].tag === 'original' ? 0 : 1) || tracks[a].label.localeCompare(tracks[b].label));
    const opts = asr => order.filter(i => tracks[i].asr === asr)
      .map(i => h('option', { value: i, textContent: tracks[i].label + (tracks[i].tag ? ` · ${tracks[i].tag}` : '') }));
    if (new Set(tracks.map(t => t.asr)).size > 1)
      sel.append(h('optgroup', { label: 'Uploaded' }, opts(false)), h('optgroup', { label: 'Auto-generated' }, opts(true)));
    else sel.append(...opts(tracks[0]?.asr ?? false));
  };
  fillTracks();
  // Preselection: browser languages in order of preference (exact region first, then base language;
  // uploaded before auto-generated) – but never auto-captions of a dubbed audio track →
  // original language (uploaded, then auto) → last choice (if not dubbed) → first uploaded track → first track.
  const pick = () => {
    const idx = f => tracks.findIndex(t => t.tag !== 'dubbed' && f(t));
    const order = [];
    for (const nl of (navigator.languages?.length ? navigator.languages : [navigator.language || 'en'])) {
      const L = nl.toLowerCase();
      order.push(idx(t => !t.asr && t.lang.toLowerCase() === L), idx(t => !t.asr && base(t.lang) === base(L)),
                 idx(t => t.asr && base(t.lang) === base(L)));
    }
    const [l, a] = (S.lang || '').split(':');
    order.push(idx(t => t.tag === 'original' && !t.asr), idx(t => t.tag === 'original'),
               idx(t => t.lang === l && t.asr === (a === 'asr')), idx(t => !t.asr), 0);
    return order.find(i => i >= 0) ?? 0;
  };
  sel.value = pick();

  const mode = h('select', { style: ctl + 'flex:1;', onchange: e => { S.mode = e.target.value; save(); update(); } },
    h('option', { value: 'para', textContent: 'Paragraphs at speech pauses' }),
    h('option', { value: 'lines', textContent: 'One line per segment' }),
    h('option', { value: 'block', textContent: 'Single block of text' }));
  mode.value = S.mode;
  const pauseVal = h('span', { style: 'min-width:38px;text-align:right;' });
  const lenVal = h('span', { style: 'min-width:38px;text-align:right;' });
  const pause = h('input', { type: 'range', min: 0.5, max: 4, step: 0.1, value: S.pause, style: 'flex:1;',
    oninput: e => { S.pause = +e.target.value; save(); update(); } });
  const maxLen = h('input', { type: 'range', min: 200, max: 2000, step: 50, value: S.maxLen, style: 'flex:1;',
    oninput: e => { S.maxLen = +e.target.value; save(); update(); } });
  const paraOpts = h('div', {}, row('Pause from', pause, pauseVal), row('Paragraph ≈', maxLen, lenVal));
  const fmt = h('select', { style: ctl, onchange: e => { S.fmt = e.target.value; save(); update(); } },
    h('option', { value: 'txt', textContent: 'Plain text' }), h('option', { value: 'md', textContent: 'Markdown' }));
  fmt.value = S.fmt;
  const statCss = `color:${C.mu};margin:8px 0 4px;min-height:16px;`;
  const stat = h('div', { style: statCss });
  // ad = true: highlighted box, so the wait for an ad is hard to miss (same colors in light and dark mode)
  const setStat = (m, ad) => {
    stat.textContent = m;
    stat.style.cssText = statCss + (ad ? 'color:#3d2e00;background:#ffd54f;font-weight:600;padding:8px 10px;border-radius:8px;' : '');
  };
  const prev = h('textarea', { readOnly: true, spellcheck: false,
    style: `width:100%;box-sizing:border-box;height:220px;resize:vertical;${ctl}font:12.5px/1.45 Roboto,Arial,sans-serif;padding:8px;` });

  let current = '';
  const fname = ext => (meta.title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || vid)
    + ` [${tracks[sel.value]?.lang || 'transcript'}].${ext}`;
  const download = ext => {
    const data = render(lastBlocks, ext, tracks[sel.value].full);
    const a = h('a', { href: URL.createObjectURL(new Blob([data], { type: ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' })), download: fname(ext) });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  };
  const flash = (b, t) => { const o = b.textContent; b.textContent = t; setTimeout(() => (b.textContent = o), 1400); };
  const copyBtn = h('button', { style: btnCss, textContent: 'Copy', onclick: async () => {
    try { await navigator.clipboard.writeText(current); flash(copyBtn, 'Copied ✓'); }
    catch (_) { prev.focus(); prev.select(); document.execCommand('copy'); flash(copyBtn, 'Copied ✓'); }
  } });
  const actions = [copyBtn,
    h('button', { style: btnCss, textContent: '.txt', onclick: () => download('txt') }),
    h('button', { style: btnCss, textContent: '.md', onclick: () => download('md') })];

  const head = h('div', { style: `display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid ${C.bd};cursor:move;user-select:none;` },
    h('strong', { style: 'font-size:14px;', textContent: 'Transcript' }),
    h('span', { style: `flex:1;min-width:0;color:${C.mu};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`, textContent: meta.title }),
    h('button', { textContent: '✕', title: 'Close', style: `border:0;background:none;color:${C.fg};font-size:16px;cursor:pointer;`, onclick: () => panel.remove() }));
  const panel = h('div', { id: NS, style: `position:fixed;top:72px;right:16px;width:400px;max-width:calc(100vw - 32px);max-height:calc(100vh - 90px);overflow:auto;z-index:2147483647;background:${C.bg};color:${C.fg};border:1px solid ${C.bd};border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);font:13px Roboto,Arial,sans-serif;` },
    head,
    h('div', { style: 'padding:8px 12px 12px;' },
      row('Track', sel), row('Layout', mode), paraOpts,
      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:0 10px;margin:6px 0;' },
        check('tstamp', 'Timestamps'), check('chap', `Chapters${chapters.length ? ` (${chapters.length})` : ''}`),
        check('clean', 'Remove [Music] etc.'), check('head', 'Header (title/URL)'),
        check('desc', 'Video description')),
      row('Preview as', fmt),
      stat, prev,
      h('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;' }, actions)));
  // Dragging
  head.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON') return;
    const r = panel.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev => { panel.style.left = Math.max(0, ev.clientX - dx) + 'px'; panel.style.top = Math.max(0, ev.clientY - dy) + 'px'; panel.style.right = 'auto'; };
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up); e.preventDefault();
  });
  document.body.append(panel);

  const setBusy = b => actions.forEach(a => (a.disabled = b, a.style.opacity = b ? .5 : 1));
  if (!tracks.length && !transcriptParams) {
    setStat('This video has no captions.');
    sel.append(h('option', { textContent: '– none –' })); setBusy(true); return;
  }
  if (!tracks.length) tracks.push({ url: '', lang: 'xx', asr: false, name: 'Default (transcript panel)', label: 'Default', full: 'Default (transcript panel)' }), sel.append(h('option', { value: 0, textContent: tracks[0].label }));

  let lastBlocks = [], seq = 0;
  async function update() {
    const my = ++seq;
    pauseVal.textContent = S.pause.toFixed(1) + ' s';
    lenVal.textContent = S.maxLen;
    paraOpts.style.display = S.mode === 'para' ? '' : 'none';
    const i = +sel.value;
    if (!cache[i]) { setBusy(true); setStat('Loading captions …'); prev.value = ''; }
    const d = await load(i, (m, ad) => my === seq && setStat(m, ad));
    if (my !== seq) return;
    if (!d) {
      setBusy(true);
      setStat('Could not load this track. Play the video briefly, then click the bookmarklet again.');
      return;
    }
    const cjk = /^(ja|zh|yue|th|lo|km|my)/.test(tracks[i].lang);
    lastBlocks = build(d.toks, cjk);
    current = render(lastBlocks, S.fmt, tracks[i].full);
    const body = lastBlocks.filter(b => !b.h);
    const count = cjk ? `${body.reduce((n, b) => n + b.text.length, 0).toLocaleString('en-US')} characters`
                      : `${body.reduce((n, b) => n + b.text.split(/\s+/).length, 0).toLocaleString('en-US')} words`;
    const paras = body.length;
    setStat(`${count} · ${paras} ${S.mode === 'lines' ? 'lines' : 'paragraphs'} · source: ${d.src}`);
    prev.value = current;
    setBusy(false);
  }
  update();
})();
