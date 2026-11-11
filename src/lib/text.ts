import { typographyParts } from "./typography.ts";
const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Escapes text and wraps [待提供] / [待翻譯] in <mark class="pending">. */
export function markPending(s: string): string {
  return escapeHtml(s).replace(/(\[待提供\]|\[待翻譯\])/g, '<mark class="pending">$1</mark>');
}

/** Text for places that cannot hold markup (meta tags, JSON-LD, alt). Markers are kept as-is. */
export function plain(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Marks [待提供] / [待翻譯] inside already-rendered Markdown HTML. Only text
 * between tags is touched, never attribute values.
 */
export function markPendingHtml(html: string): string {
  return html.replace(/>([^<]*)</g, (_, text: string) => `>${text.replace(/(\[待提供\]|\[待翻譯\])/g, '<mark class="pending">$1</mark>')}<`);
}

/** Escaped, SSR-only semantic groups. Meta/alt/plain text never use this markup. */
export function typeset(s: string, lang: string, alreadyEscaped = false): string {
  return typographyParts(s, lang).map(part => {
    if(part.group) {
      const [,before,body,after] = part.text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      const literal=(value:string)=>alreadyEscaped?value:markPending(value);
      return `${literal(before)}<span class="type-group">${typeset(body,lang,alreadyEscaped)}</span>${literal(after)}`;
    }
    const text = alreadyEscaped ? part.text : markPending(part.text);
    return part.keep ? `<span class="type-phrase">${text}</span>` : text;
  }).join("");
}

/** Preserve HTML tags/attributes, comments and code. Only prose text nodes are grouped. */
export function typesetHtml(html: string, lang: string): string {
  const protectedTags = new Set(["code", "pre", "script", "style", "textarea", "svg", "math"]);
  const stack: string[] = [];
  return html.split(/(<!--[\s\S]*?-->|<\/?[A-Za-z](?:[^>"']|"[^"]*"|'[^']*')*>)/g).map(part => {
    if(part.startsWith("<")) {
      const tag = part.match(/^<(\/?)([A-Za-z][\w:-]*)/);
      if(tag && protectedTags.has(tag[2].toLowerCase())) {
        if(tag[1])stack.pop();else if(!part.endsWith("/>"))stack.push(tag[2].toLowerCase());
      }
      return part;
    }
    return stack.length ? part : typeset(part, lang, true);
  }).join("");
}
