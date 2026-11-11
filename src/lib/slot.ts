/**
 * Resolves an image position of a landing page into what the site may show.
 * - status "withheld" (not approved for publication): the original is dropped here and
 *   never rendered, optimised or deployed; the substitute picture is used instead, if any.
 * - kind "illustration", or any substitute: the picture is labelled 情境示意圖 by the page components.
 */
export interface SlotInput<Img> {
  src?: Img;
  alt?: string;
  need?: string;
  caption?: string;
  ratio?: string;
  fit?: "cover" | "contain";
  kind?: "approved" | "illustration";
  status?: "public" | "withheld";
  substitute?: { src: Img; alt: string };
}

export function resolveSlot<Img, R extends string>(input: SlotInput<Img> & { ratio?: R }) {
  const { kind, status, substitute, ...rest } = input;
  const withheld = status === "withheld";
  const shown = withheld ? substitute : rest;
  return {
    need: rest.need,
    caption: rest.caption,
    ratio: rest.ratio,
    fit: rest.fit,
    src: shown?.src,
    alt: shown?.alt,
    /** True when the label 情境示意圖 must be drawn on the picture. */
    illustration: !!shown?.src && (kind === "illustration" || (withheld && !!substitute?.src)),
  };
}
