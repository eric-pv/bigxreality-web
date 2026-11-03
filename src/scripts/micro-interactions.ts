/** One controller per document, including when a router re-executes the entry script. */
declare global { interface Window { bxrMotionDispose?: () => void } }

/* Home hero entrance (once per element). The HTML keeps the full text; the eyebrow gets an aria-hidden
   visual layer and the H1 a clip-path animation on itself — no text nodes are cloned or moved. */
const COUNT_MS = 1200;
const LINE_MS = 700, LINE_STAGGER = 120, LINE_START = 150;
/** Site-wide "pause animations" choice (WCAG 2.2.2). Read before first paint by the head script in BaseLayout. */
const MOTION_KEY = 'bxr-motion';
const readStoredOff = () => { try { return localStorage.getItem(MOTION_KEY) === 'off'; } catch { return false; } };
const storeOff = (off: boolean) => { try { if (off) localStorage.setItem(MOTION_KEY, 'off'); else localStorage.removeItem(MOTION_KEY); } catch { /* storage unavailable: the choice lasts for this page only */ } };
interface HeroRun { title: HTMLElement; timer: number; finish: () => void }
type CharBox = { node: Text; offset: number; rect: DOMRect; index: number };
function measureChars(root: HTMLElement): CharBox[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange(), boxes: CharBox[] = [];
  let index = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (let offset = 0; offset < node.length; offset++, index++) {
      if (/\s/.test(node.data[offset])) continue;
      range.setStart(node, offset); range.setEnd(node, offset + 1);
      boxes.push({ node, offset, rect: range.getBoundingClientRect(), index });
    }
  }
  return boxes;
}
/** Group visible characters into rendered lines (by vertical position, not by language rules). */
function groupLines(boxes: CharBox[]) {
  const lines: CharBox[][] = [];
  for (const box of boxes) {
    const line = lines.at(-1);
    if (line && box.rect.top < line[0].rect.top + line[0].rect.height / 2) line.push(box);
    else lines.push([box]);
  }
  return lines;
}
export function installMotion() {
  window.bxrMotionDispose?.();
  const events = new AbortController();
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const selector = '.section-head, .section-grid > header, h2:not(.visually-hidden), .page-hero .copy';
  let epoch = 0;
  let main: HTMLElement | null = null;
  let registered = new WeakSet<Element>();
  let intersection: IntersectionObserver | undefined;
  let mutations: MutationObserver | undefined;
  let loops: IntersectionObserver | undefined;
  let resize: ResizeObserver | undefined;
  let hero: HeroRun | undefined;
  let counters: IntersectionObserver | undefined;
  /** Running count-ups: element → restore. The server HTML always holds the final value. */
  const counting = new Map<HTMLElement, () => void>();
  const countUp = (el: HTMLElement) => {
    const final = el.textContent?.trim() ?? '';
    if (!/^\d+$/.test(final) || el.dataset.counted) return;
    el.dataset.counted = 'true';
    const target = Number(final);
    const visual = Object.assign(document.createElement('span'), { className: 'count-visual', textContent: '0' });
    visual.setAttribute('aria-hidden', 'true');
    visual.style.minWidth = `${final.length}ch`;
    el.replaceChildren(visual, Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: final }));
    let frame = 0;
    const restore = () => { cancelAnimationFrame(frame); counting.delete(el); el.textContent = final; };
    counting.set(el, restore);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / COUNT_MS, 1);
      visual.textContent = String(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick); else restore();
    };
    frame = requestAnimationFrame(tick);
  };
  const html = document.documentElement;
  if (readStoredOff()) html.classList.add('motion-off');
  /** System reduced motion, or the visitor's own pause: either way no new animation runs. */
  const motionOff = () => preference.matches || html.classList.contains('motion-off');
  const clear = () => {
    epoch++;
    hero?.finish();
    intersection?.disconnect();
    mutations?.disconnect();
    loops?.disconnect();
    counters?.disconnect();
    counters = undefined;
    counting.forEach(restore => restore());
    resize?.disconnect();
    tracking?.abort();
    intersection = undefined;
    mutations = undefined;
    loops = undefined;
    resize = undefined;
    document.querySelectorAll('[data-motion-loop][data-in-view]').forEach(el => el.removeAttribute('data-in-view'));
    document.querySelectorAll('.motion-enter').forEach(el => el.classList.remove('motion-enter'));
    main = null;
    registered = new WeakSet();
  };
  const register = (root: Element) => {
    const candidates = [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    for (const el of candidates) {
      // Animate a heading group once, never its nested heading a second time.
      if (el.matches('h2') && el.closest('.section-head, .section-grid > header')) continue;
      if (!main?.contains(el) || registered.has(el)) continue;
      registered.add(el);
      if (!el.contains(document.activeElement)) intersection?.observe(el);
    }
  };
  /** A running line reveal follows reflow: a width change finishes it, a web-font swap refits its bands. */
  let tracking: AbortController | undefined;
  const trackTitle = (title: HTMLElement, refit: () => void) => {
    tracking = new AbortController();
    let width = title.offsetWidth;
    if ('ResizeObserver' in window) {
      resize = new ResizeObserver(() => {
        if (title.offsetWidth !== width) { width = title.offsetWidth; hero?.finish(); } else refit();
      });
      resize.observe(title);
    }
    document.fonts?.addEventListener('loadingdone', refit, { signal: tracking.signal });
  };
  const enterHero = (root: HTMLElement) => {
    const title = root.querySelector<HTMLElement>('.title'), eyebrow = root.querySelector<HTMLElement>('.eyebrow');
    if (!title || !eyebrow) return;
    root.dataset.motion = 'running';
    // Eyebrow: full text for assistive tech, per-character visual layer (aria-hidden) for the typing effect.
    const label = eyebrow.textContent?.trim() ?? '';
    const spoken = Object.assign(document.createElement('span'), { className: 'visually-hidden', textContent: label });
    const visual = Object.assign(document.createElement('span'), { className: 'type-visual' });
    visual.setAttribute('aria-hidden', 'true');
    visual.append(...[...label].map((char, i, all) => {
      const glyph = Object.assign(document.createElement('span'), { textContent: char });
      glyph.style.setProperty('--i', String(i));
      if (i === all.length - 1) glyph.className = 'last';
      return glyph;
    }));
    eyebrow.replaceChildren(spoken, visual);
    // Title: reveal each rendered line bottom-up with one clip-path animation on the H1 itself.
    const pad = 16, ease = (x: number) => 1 - (1 - x) ** 4;
    let bands: number[][] = [];
    // Each rendered line is a band that grows upward from its bottom edge, eased like --ease-precise.
    const frames = () => {
      const lines = groupLines(measureChars(title)), box = title.getBoundingClientRect();
      const tops = lines.map(line => Math.min(...line.map(b => b.rect.top)) - box.top);
      bands = tops.map((top, i) => [i ? top : -pad, tops[i + 1] ?? box.height + pad]);
      const span = Math.max(bands.length - 1, 0) * LINE_STAGGER + LINE_MS, steps = 24;
      return Array.from({ length: steps + 1 }, (_, step) => ({ clipPath: 'polygon(' + bands.map(([y0, y1], i) => {
        const p = ease(Math.min(Math.max((span * step / steps - i * LINE_STAGGER) / LINE_MS, 0), 1)), top = y1 - (y1 - y0) * p;
        return `-${pad}px ${top}px, calc(100% + ${pad}px) ${top}px, calc(100% + ${pad}px) ${y1}px, -${pad}px ${y1}px`;
      }).join(', ') + ')' }));
    };
    const keyframes = frames();
    const linesEnd = LINE_START + Math.max(bands.length - 1, 0) * LINE_STAGGER + LINE_MS;
    const reveal = bands.length ? title.animate(keyframes, { duration: linesEnd - LINE_START, delay: LINE_START, fill: 'backwards' }) : undefined;
    const run: HeroRun = {
      title, timer: 0,
      finish: () => {
        clearTimeout(run.timer);
        if (hero !== run) return;
        hero = undefined;
        reveal?.cancel();
        tracking?.abort();
        resize?.disconnect();
        root.dataset.motion = 'done';
      },
    };
    hero = run;
    run.timer = window.setTimeout(run.finish, linesEnd + 50);
    // Line count can change when the web font arrives mid-entrance: refit the bands, same timing.
    trackTitle(title, () => { if (hero === run && reveal?.effect instanceof KeyframeEffect) reveal.effect.setKeyframes(frames()); });
  };
  /** The header's pause control mirrors the effective state; under system reduced motion it stays "paused". */
  const syncToggle = () => {
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-motion-toggle]')) {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(motionOff()));
      if (preference.matches) button.setAttribute('aria-disabled', 'true'); else button.removeAttribute('aria-disabled');
    }
  };
  const initialize = () => {
    const next = document.querySelector<HTMLElement>('main');
    if (next && next === main) return;
    clear();
    html.classList.add('motion-live');
    const heroRoot = next?.querySelector<HTMLElement>('[data-hero]');
    const animateHero = !!heroRoot && !heroRoot.dataset.motion && html.classList.contains('motion-ready');
    syncToggle();
    if (!next || motionOff() || !('IntersectionObserver' in window)) { html.classList.remove('motion-ready'); return; }
    main = next;
    const generation = epoch;
    // Slow loops (sweep lines, drifting glows) only run while their section is on screen.
    loops = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
    });
    main.querySelectorAll('[data-motion-loop]').forEach(el => loops!.observe(el));
    // Count-ups start just before the number scrolls in, so the final value is not seen first.
    counters = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement, style = getComputedStyle(el);
        counters?.unobserve(el);
        // Start once the digits' own face is ready: a mid-count font swap would change their width.
        const start = () => { if (generation === epoch && !motionOff()) countUp(el); };
        if (document.fonts) document.fonts.load(`${style.fontSize} ${style.fontFamily}`).then(start, start); else start();
      }
    }, { rootMargin: '0px 0px 5% 0px' });
    main.querySelectorAll('[data-count]:not([data-counted])').forEach(el => counters!.observe(el));
    if (animateHero) enterHero(heroRoot!);
    html.classList.remove('motion-ready');
    intersection = new IntersectionObserver(entries => {
      if (generation !== epoch || motionOff()) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        intersection?.unobserve(entry.target);
        if (entry.target.isConnected && !entry.target.contains(document.activeElement)) entry.target.classList.add('motion-enter');
      }
    }, { threshold: 0.15 });
    register(main);
    // Observe insertions only: animation classes and unrelated attribute changes never rescan.
    mutations = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.removedNodes) if (node instanceof Element) {
          intersection?.unobserve(node);
          node.querySelectorAll(selector).forEach(el => intersection?.unobserve(el));
        }
        for (const node of record.addedNodes) if (node instanceof Element) register(node);
      }
    });
    mutations.observe(main, { childList: true, subtree: true });
  };
  document.addEventListener('animationend', event => {
    if (event.animationName === 'bxr-enter') (event.target as Element).classList.remove('motion-enter');
  }, { signal: events.signal });
  document.addEventListener('focusin', event => {
    const group = (event.target as Element).closest(selector);
    if (group) { intersection?.unobserve(group); group.classList.remove('motion-enter'); }
  }, { signal: events.signal });
  // Header: scrolled state after 40 px and a reading-progress bar. One passive listener, rAF-throttled;
  // it only writes a class and a custom property used by transform, so no layout work per frame.
  let headerFrame = 0;
  const updateHeader = () => {
    headerFrame = 0;
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    if (!header) return;
    const root = document.scrollingElement ?? html, max = root.scrollHeight - innerHeight;
    header.classList.toggle('is-scrolled', scrollY > 40);
    header.style.setProperty('--read', max > 0 ? Math.min(Math.max(scrollY / max, 0), 1).toFixed(4) : '0');
  };
  const queueHeader = () => { if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader); };
  window.addEventListener('scroll', queueHeader, { passive: true, signal: events.signal });
  window.addEventListener('resize', queueHeader, { passive: true, signal: events.signal });
  document.addEventListener('astro:page-load', queueHeader, { signal: events.signal });
  window.addEventListener('pageshow', queueHeader, { signal: events.signal });
  events.signal.addEventListener('abort', () => cancelAnimationFrame(headerFrame));
  queueHeader();
  preference.addEventListener('change', () => { clear(); initialize(); }, { signal: events.signal });
  // Pause animations (header button): stops loops, shows entrances in their final state, persists across pages.
  document.addEventListener('click', event => {
    const button = (event.target as Element | null)?.closest?.('[data-motion-toggle]');
    if (!button || preference.matches) return;
    const off = !html.classList.contains('motion-off');
    html.classList.toggle('motion-off', off);
    storeOff(off);
    clear(); initialize();
  }, { signal: events.signal });
  // A background tab pauses every CSS loop; they resume where they were.
  const syncHidden = () => html.classList.toggle('motion-tab-hidden', document.hidden);
  document.addEventListener('visibilitychange', syncHidden, { signal: events.signal });
  syncHidden();
  window.addEventListener('pagehide', clear, { signal: events.signal });
  window.addEventListener('pageshow', event => {
    if (event.persisted) clear();
    initialize();
  }, { signal: events.signal });
  document.addEventListener('astro:before-swap', clear, { signal: events.signal });
  document.addEventListener('astro:page-load', initialize, { signal: events.signal });
  window.bxrMotionDispose = () => { clear(); events.abort(); };
  initialize();
}
