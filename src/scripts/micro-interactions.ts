/** One controller per document, including when a router re-executes the entry script. */
declare global { interface Window { bxrMotionDispose?: () => void } }

/* Home hero entrance (once per element). The HTML keeps the full text; these helpers only add
   aria-hidden visual layers or temporary line wrappers that are removed when the entrance ends. */
const LINE_MS = 700, LINE_STAGGER = 120, LINE_START = 150, KEY_MS = 500, TYPE_STEP = 55;
interface HeroRun { title: HTMLElement; timer: number; finish: () => void }
type CharBox = { node: Text; offset: number; rect: DOMRect; index: number };
function measureChars(root: HTMLElement): CharBox[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange(), boxes: CharBox[] = [];
  let index = 0;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (node.parentElement?.closest('.hero-key')) continue;
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
/** Second phrase of the title, split on the title's own separators (．/・/". "). None found → no underline. */
function keyPhrase(text: string): [number, number] | undefined {
  const separator = /[．・]|\.(?=\s|$)/g, marks = [...text.matchAll(separator)].map(m => m.index!);
  if (!marks.length || marks[0] >= text.length - 1) return;
  let start = marks[0] + 1;
  while (start < text.length && /\s/.test(text[start])) start++;
  let end = marks[1] ?? text.length;
  while (end > start && /\s/.test(text[end - 1])) end--;
  return end > start ? [start, end] : undefined;
}
function placeKey(title: HTMLElement, key: HTMLElement) {
  const span = keyPhrase(title.textContent ?? '');
  if (!span) { key.replaceChildren(); return 0; }
  const origin = title.getBoundingClientRect();
  const lines = groupLines(measureChars(title).filter(box => box.index >= span[0] && box.index < span[1]));
  key.replaceChildren(...lines.map(line => {
    const bar = document.createElement('i');
    const left = Math.min(...line.map(b => b.rect.left)), right = Math.max(...line.map(b => b.rect.right));
    const bottom = Math.max(...line.map(b => b.rect.bottom));
    bar.style.cssText = `left:${left - origin.left}px;top:${bottom - origin.top + 2}px;width:${right - left}px`;
    return bar;
  }));
  return lines.length;
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
  const html = document.documentElement;
  const clear = () => {
    epoch++;
    hero?.finish();
    intersection?.disconnect();
    mutations?.disconnect();
    loops?.disconnect();
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
  /** Keeps the drawn underline (and a running line reveal) aligned when the title reflows: resize or web-font swap. */
  let tracking: AbortController | undefined;
  const trackKey = (title: HTMLElement, onReflow?: () => void) => {
    const key = title.querySelector<HTMLElement>(':scope > .hero-key');
    if (!key) return;
    tracking = new AbortController();
    const reflow = () => { placeKey(title, key); onReflow?.(); };
    let width = title.offsetWidth;
    if ('ResizeObserver' in window) {
      resize = new ResizeObserver(() => {
        if (title.offsetWidth !== width) { width = title.offsetWidth; hero?.finish(); }
        reflow();
      });
      resize.observe(title);
    }
    document.fonts?.addEventListener('loadingdone', reflow, { signal: tracking.signal });
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
    // Title: underline the second phrase, then reveal each rendered line bottom-up with one clip-path
    // animation on the H1 itself. No text nodes are cloned or moved, so nothing needs restoring.
    const key = Object.assign(document.createElement('span'), { className: 'hero-key' });
    key.setAttribute('aria-hidden', 'true');
    title.append(key);
    const keyLines = placeKey(title, key);
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
    key.style.setProperty('--d', `${linesEnd - 100}ms`);
    const total = keyLines ? linesEnd - 100 + KEY_MS : linesEnd;
    const run: HeroRun = {
      title, timer: 0,
      finish: () => {
        clearTimeout(run.timer);
        if (hero !== run) return;
        hero = undefined;
        reveal?.cancel();
        key.classList.add('is-drawn');
        root.dataset.motion = 'done';
      },
    };
    hero = run;
    run.timer = window.setTimeout(run.finish, total + 50);
    // Line count can change when the web font arrives mid-entrance: refit the bands, same timing.
    trackKey(title, () => { if (hero === run && reveal?.effect instanceof KeyframeEffect) reveal.effect.setKeyframes(frames()); });
  };
  const initialize = () => {
    const next = document.querySelector<HTMLElement>('main');
    if (next && next === main) return;
    clear();
    html.classList.add('motion-live');
    const heroRoot = next?.querySelector<HTMLElement>('[data-hero]');
    const animateHero = !!heroRoot && !heroRoot.dataset.motion && html.classList.contains('motion-ready');
    if (!next || preference.matches || !('IntersectionObserver' in window)) { html.classList.remove('motion-ready'); return; }
    main = next;
    const generation = epoch;
    // Slow loops (sweep lines, drifting glows) only run while their section is on screen.
    loops = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
    });
    main.querySelectorAll('[data-motion-loop]').forEach(el => loops!.observe(el));
    if (animateHero) enterHero(heroRoot!);
    else if (heroRoot?.dataset.motion === 'done') trackKey(heroRoot.querySelector<HTMLElement>('.title')!);
    html.classList.remove('motion-ready');
    intersection = new IntersectionObserver(entries => {
      if (generation !== epoch || preference.matches) return;
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
  preference.addEventListener('change', () => { clear(); initialize(); }, { signal: events.signal });
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
