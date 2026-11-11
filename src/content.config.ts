import {contentEntryId} from "./lib/content-locale";
import { TECHNOLOGY_IDS } from "./lib/technologies";
import { resolveSlot } from "./lib/slot";
import { existsSync } from "node:fs";
import { defineCollection, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { PENDING } from "./lib/pending";
import { DOMAINS, PRODUCT_DOMAINS } from "./lib/domains";
import { INVESTOR_MODULES, PARTNER_CATEGORIES } from "./lib/company";
import { contentSource } from "./lib/content-source";

/*
 * Entry ids are `<lang>/<slug>` (lang = URL segment en / tw / jp) whatever the source.
 * Structural fields (order, domains, relations, dates, draft) are read from the `tw`
 * entry only; see docs/PLAN.md §2.1. Relations store bare slugs and are checked at
 * build time in src/lib/content.ts (unknown slugs fail the build).
 *
 * Official content comes from Git Markdown; TEST FIXTURE builds read tests/fixtures/content
 * (see src/lib/content-source.ts). Both produce exactly the same entry shapes.
 */

const source = contentSource();
const FOLDER: Record<string, string> = { "case-studies": "case-studies" };
function loader(collection: string) {
  const folder = FOLDER[collection] ?? collection;
  const fixture = `./tests/fixtures/content/${folder}`;
  const base = source === "fixtures" && existsSync(fixture) ? fixture : `./src/content/${folder}`;
  return glob({ pattern: ["technologies", "technology-overview"].includes(collection) ? "*/*.json" : "*/*.md", base, generateId:({entry})=>contentEntryId(entry,{allowLegacy:source==="fixtures"&&base===fixture}) });
}

const pending = z.literal(PENDING);
const text = z.string().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug: lowercase letters, digits and hyphens");
const slugs = z.array(slug).default([]);
const translationStatus = z.enum(["source", "pending", "translated"]);
/** Numeric field that may hold the PENDING marker until the value is known. */
const numberOrPending = z.union([z.number().nonnegative(), pending]);

/** An image always carries alt text (WCAG 1.1.1). */
const picture = ({ image }: SchemaContext) => z.object({ src: image(), alt: text });

const titled = z.object({ title: text, description: text });
const seo = (ctx: SchemaContext) =>
  z.object({ title: text.optional(), description: text.optional(), ogImage: ctx.image().optional() }).optional();
const cta = z.object({ title: text, description: text });
/** Paragraphs separated by a blank line. */
const paragraphs = z.string().min(1);
/**
 * Product sales landing page (owner copy V2.0, 2026-10-20). Shared by every product:
 * all parts except the hero and the closing CTA are optional, and every list may have
 * any number of items (no fixed count of features or scenarios). When present, the
 * product page uses this layout; products without it keep the original template.
 * Order on the page: hero → challenge → approach → capabilities → flow → scenarios →
 * values → related products and solutions → closing CTA.
 */
const card = z.object({ title: text, description: text });
/**
 * An image position on a landing page. `need` says what material belongs there (shown on
 * the placeholder and in the supplier checklist); once `src` and `alt` are set the photo
 * replaces the placeholder with no layout change.
 */
const RATIOS = ["16 / 9", "3 / 2", "4 / 3", "4 / 5", "1 / 1"] as const;
/** Image type: an approved real photo (default) or an illustration of the scene, which the site labels 情境示意圖. */
const IMAGE_KINDS = ["approved", "illustration"] as const;
/** Publication status: only "public" (default) images are ever shown. */
const IMAGE_STATUS = ["public", "withheld"] as const;
const slot = (ctx: SchemaContext) =>
  z
    .object({
      src: ctx.image().optional(),
      alt: text.optional(),
      need: text.optional(),
      caption: text.optional(),
      /** Recommended aspect ratio of the photo for this position (the page lays the position out at this ratio). */
      ratio: z.enum(RATIOS).optional(),
      /** Keep equipment and interface labels visible inside the same 16:9 frame. */
      fit: z.enum(["cover", "contain"]).optional(),
      kind: z.enum(IMAGE_KINDS).optional(),
      status: z.enum(IMAGE_STATUS).optional(),
      /** Stand-in used instead of the original while it is withheld (shown with the 情境示意圖 label). */
      substitute: z.object({ src: ctx.image(), alt: text }).optional(),
    })
    // A withheld original is dropped here, so it is never rendered, optimised or deployed.
    .transform((v) => resolveSlot(v));
/** Step / feature icons drawn by the site (components/FlowIcon.astro). */
const FLOW_ICONS = ["target", "team", "variation", "review", "route", "headset", "link"] as const;
const landing = (ctx: SchemaContext) => z.object({
  headline: text,
  subheadline: text,
  /** Short product introduction shown under the sub-headline. */
  intro: text.optional(),
  /** Optional photo shown under the introduction (3:2 by default). */
  introImage: slot(ctx).optional(),
  /** Hero image position (16:9). */
  heroImage: slot(ctx).optional(),
  /** Button text of the hero and closing CTA, e.g. 洽詢 SUT 訓練系統. */
  ctaLabel: text,
  challenge: z.object({
    title: text,
    intro: paragraphs.optional(),
    cards: z.array(card).min(1),
    /** Closing remark under the cards. */
    note: text.optional(),
  }).optional(),
  approach: z.object({
    title: text,
    intro: paragraphs.optional(),
    /** Image positions beside the text, e.g. [physical training photo, virtual scene]. */
    images: z.array(slot(ctx)).max(3).optional(),
    /** Value pillars: title + description (a technology may appear in the text, not as the title). */
    pillars: z.array(card).optional(),
  }).optional(),
  capabilities: z
    .object({
      title: text,
      intro: text.optional(),
      /** Each capability: what it is, and what it gives the trainee. An `image` makes it a picture + text row. */
      items: z.array(z.object({ title: text, content: text, value: text.optional(), image: slot(ctx).optional() })).min(1),
    })
    .optional(),
  flow: z
    .object({
      title: text,
      intro: text.optional(),
      steps: z.array(card.extend({ icon: z.enum(FLOW_ICONS).optional(), image: slot(ctx).optional() })).min(1),
      /** Shown under the steps; e.g. that the flow is a suggested teaching use, not a software procedure. */
      note: text.optional(),
    })
    .optional(),
  scenarios: z
    .object({
      title: text,
      intro: text.optional(),
      items: z.array(z.object({ title: text, description: text, focus: text.optional(), image: slot(ctx).optional() })).min(1),
    })
    .optional(),
  values: z
    .object({
      title: text,
      intro: text.optional(),
      cards: z.array(card).min(1),
      note: text.optional(),
    })
    .optional(),
  /**
   * Featured items shown side by side (e.g. the two integration solutions under Military Simulation).
   * Each links to a solution page by slug, only when that page exists in the language.
   */
  featured: z
    .object({
      title: text,
      intro: text.optional(),
      items: z.array(z.object({ title: text, description: paragraphs, ctaLabel: text, solution: slug })).min(1),
    })
    .optional(),
  /**
   * Free-form sections shown in order after the fixed sections above (used by the English pages, whose
   * copy is a sequence of headline + text / list / bullet blocks):
   * - prose: eyebrow, title and paragraphs
   * - list: titled items with text (cards)
   * - checks: short bullet items with a check mark
   * - featured: side-by-side items linking to a solution or product page that exists
   */
  blocks: z
    .array(
      z.object({
        kind: z.enum(["prose", "list", "checks", "featured", "media"]),
        eyebrow: text.optional(),
        title: text,
        intro: text.optional(),
        body: paragraphs.optional(),
        items: z.array(z.object({ title: text, content: paragraphs.optional(), cta: text.optional(), solution: slug.optional(), product: slug.optional(), image: slot(ctx).optional() })).optional(),
      }),
    )
    .optional(),
  /** "Who it is for": a short list of cards with an optional closing note, shown after the scenarios. */
  audience: z.object({ title: text, intro: text.optional(), cards: z.array(card).min(1), note: text.optional() }).optional(),
  /** One sentence under the "applied cases" heading; the cases themselves come from case relations (lib/cases.ts). */
  casesIntro: text.optional(),
  /** Related products / solutions: intro text only; the cards come from relations that have real pages. */
  related: z.object({ title: text, intro: text.optional() }).optional(),
  closing: z.object({ title: text, description: text.optional() }),
});

const products = defineCollection({
  loader: loader("products"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      draft: z.boolean().default(false),
      publishDate: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      order: z.number().int(),
      /** Product categories only (military / police / fire-rescue). Smart City is a solution, never a product category. */
      domains: z.array(z.enum(PRODUCT_DOMAINS)).min(1),
      hero: z.object({
        name: text,
        englishName: text.optional(),
        /** Short product code, only where the company has confirmed one (shown as "Product · CODE", used as the inquiry item). */
        code: text.optional(),
        tagline: text,
        image: picture(ctx).optional(),
      }),
      summary: text.optional(),
      landing: landing(ctx).optional(),
      /** Frequently asked questions (question + full answer). Rendered as a single-open accordion with FAQPage JSON-LD; the page shows them only in the language that supplies them. */
      faq: z.array(z.object({ question: text, answer: text })).optional(),
      capabilities: z.array(titled).optional(),
      howItWorks: z.array(titled).optional(),
      scenarios: z.array(titled).optional(),
      components: z.array(z.object({ name: text, description: text })).optional(),
      deployment: z
        .object({
          personnel: z
            .union([z.object({ min: z.number().int().positive(), max: z.number().int().positive(), approx: z.boolean().default(false) }), pending])
            .optional(),
          area: numberOrPending.optional(),
          setupTime: numberOrPending.optional(),
          notes: text.optional(),
        })
        .optional(),
      integratedOps: z.object({ description: text.optional(), products: z.array(slug).optional() }).optional(),
      /**
       * Other products worth looking at next, shown on the landing page. Not an integration:
       * confirmed integrations belong in integratedOps. Listed one way (this product → those).
       */
      relatedProducts: z.array(slug).optional(),
      relatedSolutions: z.array(slug).optional(),
      cta: cta
        .extend({ brochure: z.boolean().default(true), demo: z.boolean().default(true) })
        .optional(),
      seo: seo(ctx),
    }),
});

/** Market domains. Overview text is the Markdown body; related products and articles are reverse lookups. */
const solutions = defineCollection({
  loader: loader("solutions"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      draft: z.boolean().default(false),
      order: z.number().int(),
      domain: z.enum(DOMAINS),
      name: text,
      englishName: text,
      summary: text,
      /** Button text on the overview card (e.g. 探索軍事模擬). */
      cardLabel: text.optional(),
      /** Headline shown on the overview card instead of the English name line. */
      cardHeadline: text.optional(),
      /** Slug of the solution this one belongs to (MUM-T and NOVA belong to military); it is not a fifth category. */
      parent: slug.optional(),
      relatedSolutions: slugs,
      /** Products shown on the page in addition to those that list this solution (products.relatedSolutions). */
      relatedProducts: slugs,
      landing: landing(ctx).optional(),
      heroDescription: text.optional(),
      image: picture(ctx).optional(),
      challenges: z.array(titled).optional(),
      capabilities: z.array(titled).optional(),
      cta: cta.optional(),
      /** Where the wording comes from (old official site, requirements); not shown on the site. */
      sourceNote: text.optional(),
      seo: seo(ctx),
    }),
});

/** Copy for fixed page templates (one entry per page per language). */
const pages = defineCollection({
  loader: loader("pages"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      /**
       * TW only, and read only by pages routed through getLocalized (today: privacy). true = the page
       * is not built and its Footer legal link stays hidden. Other fixed pages ignore it.
       */
      draft: z.boolean().default(false),
      seo: z.object({ title: text, description: text }),
      hero: z.object({
        eyebrow: text,
        title: text,
        /** Sub-headline: one sentence under the title. */
        lead: text.optional(),
        description: text.optional(),
        image: picture(ctx).optional(),
        imageCaption: text.optional(),
      }),
      /** One closing line shown in a band above the footer (company page: the slogan). */
      closing: z.object({ title: text }).optional(),
      /** A short list of principle cards (solutions overview). */
      highlights: z.object({ title: text, items: z.array(card).min(1) }).optional(),
      /** Closing band; `button` is the label of its contact button. */
      cta: cta.extend({ button: text.optional() }).optional(),
    }),
});

/** Fixed tag list; articles can only use these (docs/PHASE-2-PLAN.md §3.5). */
const tags = defineCollection({
  loader: loader("tags"),
  schema: z.object({ translationStatus, name: text, description: text.optional() }),
});

/** Fields shared by news, insights and case studies (§3.2). The body is the article text. */
const articleBase = (ctx: SchemaContext) =>
  z.object({
    translationStatus,
    draft: z.boolean().default(false),
    publishDate: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    title: text,
    summary: text,
    cover: picture(ctx).optional(),
    tags: slugs,
    relatedProducts: slugs,
    relatedSolutions: slugs,
    relatedNews: slugs,
    relatedInsights: slugs,
    relatedCaseStudies: slugs,
    seo: seo(ctx),
  });

export const NEWS_CATEGORIES = ["event", "product", "insight", "company", "exhibition", "award", "product-launch", "partnership", "media"] as const;

const news = defineCollection({
  loader: loader("news"),
  schema: (ctx) =>
    articleBase(ctx).extend({
      // Historical news may lack a known publication date; never coerce null to 1970.
      publishDate: z.preprocess(value => value === null ? undefined : value, z.coerce.date().optional()),
      dateUnconfirmed: z.boolean().default(false),
      dateNote: text.optional(),
      dateCandidate: text.optional(),
      dateSource: text.optional(),
      dateReviewNote: text.optional(),
      featured: z.boolean().default(false),
      featuredPriority: z.number().int().default(0),
      featuredInCSR: z.boolean().default(false),
      csrCategories: z.array(z.enum(["defense-education", "disaster-resilience", "technology-education", "community-engagement"])).default([]),
      articleId: slug.optional(),
      imageId: slug.optional(),
      mediaId: slug.optional(),
      sourceCategory: text.optional(),
      importNote: text.optional(),
      category: z.enum(NEWS_CATEGORIES),
      event: z.object({ name: text, location: text.optional(), startDate: z.coerce.date(), endDate: z.coerce.date().optional() }).optional(),
      source: z.object({ name: text, url: z.url() }).optional(),
    }),
});

const insights = defineCollection({
  loader: loader("insights"),
  schema: (ctx) => articleBase(ctx).extend({ author: text.optional(), technologyTags: z.array(z.enum(TECHNOLOGY_IDS)).default([]) }),
});

/** Application fields of a case study: the four market domains plus "other". */
const CASE_DOMAINS = [...DOMAINS, "other"] as const;

const caseStudies = defineCollection({
  loader: loader("case-studies"),
  schema: (ctx) =>
    articleBase(ctx).extend({
      /**
       * `name` is shown only when `disclosure` is "public"; otherwise `type` (e.g. a unit type)
       * is shown, falling back to `name` which then must already be an anonymised description.
       */
      client: z.object({ name: text, type: text.optional(), disclosure: z.enum(["public", "anonymized"]) }),
      /** Client authorisation to publish; entries without it are never built. */
      approval: z.object({ approved: z.boolean() }),
      /** Detail page sections; each is optional and a section without data is not shown. Paragraphs are separated by a blank line. */
      background: paragraphs.optional(),
      challenge: paragraphs.optional(),
      solution: paragraphs.optional(),
      application: paragraphs.optional(),
      /** Confirmed, publishable results only: a narrative and/or labelled figures. */
      results: paragraphs.optional(),
      outcomes: z.array(z.object({ label: text, value: text })).optional(),
      gallery: z.array(picture(ctx).extend({ caption: text.optional() })).optional(),
      domains: z.array(z.enum(CASE_DOMAINS)).default([]),
    }),
});

/** Company history: one entry per milestone (date is YYYY or YYYY-MM). */
const milestones = defineCollection({
  loader: loader("milestones"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      draft: z.boolean().default(false),
      date: z.string().regex(/^\d{4}(-\d{2})?$/, "date: YYYY or YYYY-MM"),
      title: text,
      summary: text.optional(),
      image: picture(ctx).optional(),
    }),
});

/** Management team: only people who agreed to be listed. */
const team = defineCollection({
  loader: loader("team"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      draft: z.boolean().default(false),
      order: z.number().int(),
      name: text,
      role: text,
      bio: text.optional(),
      photo: picture(ctx).optional(),
    }),
});

/** Partners. An entry is public only with the partner's authorisation (approval), like case studies. */
const partners = defineCollection({
  loader: loader("partners"),
  schema: (ctx) =>
    z.object({
      translationStatus,
      draft: z.boolean().default(false),
      order: z.number().int(),
      /** The partner authorised the public naming / logo; entries without it are never built. */
      approval: z.object({ approved: z.boolean() }),
      category: z.enum(PARTNER_CATEGORIES),
      name: text,
      description: text.optional(),
      logo: picture(ctx).optional(),
      url: z.url().optional(),
    }),
});

/**
 * Investor relations records, one collection for all seven modules. `publishDate` is the date of the
 * record (announcement date, report date…); a future date keeps it off the site until then.
 * Only officially approved, public material belongs here.
 */
const investorItems = defineCollection({
  loader: loader("investor-items"),
  schema: z.object({
    translationStatus,
    draft: z.boolean().default(false),
    publishDate: z.coerce.date(),
    module: z.enum(INVESTOR_MODULES),
    category: text.optional(),
    order: z.number().int().optional(),
    title: text,
    summary: text.optional(),
    attachments: z.array(z.object({ label: text, url: z.url() })).optional(),
  }),
});

/** Full technology copy is canonical JSON in Git, edited using regular CMS fields. */
const technologySection = z.object({
 id: slug, title: text, paragraphs:z.array(text).default([]),
 items:z.array(z.object({title:text,paragraphs:z.array(text).default([])})).optional(),
 bullets:z.array(text).optional(),note:text.optional(),body:z.string().optional(),
});
const technologies = defineCollection({loader:loader("technologies"),schema:(ctx)=>z.object({
 heroImage:picture(ctx).optional(),
 translationStatus,draft:z.boolean().default(false),eyebrow:text,title:text,lead:text,intro:z.array(text).default([]),
 primaryCta:text,secondaryCta:text,sections:z.array(technologySection).min(1),relatedTitle:text,
 faq:z.array(z.object({question:text,answer:text})).default([]),closing:z.object({title:text,body:text,cta:text}),
 seo:z.object({title:text,description:text}),relatedProducts:slugs,relatedSolutions:slugs,
 primaryDestination:z.enum(["products","solutions"]),relationNotes:z.array(text).default([]),body:z.string().optional(),
})});
const technologyOverview = defineCollection({loader:loader("technology-overview"),schema:(ctx)=>z.object({
 heroImage:picture(ctx).optional(),
 translationStatus,eyebrow:text,title:text,lead:text,intro:z.array(text).default([]),
 technologies:z.object(Object.fromEntries(TECHNOLOGY_IDS.map(id=>[id,z.object({title:text,description:text})]))),
 seo:z.object({title:text,description:text}),
})});

export const collections = {
  technologies, "technology-overview": technologyOverview, products, solutions, pages, tags, insights, news, "case-studies": caseStudies, milestones, team, partners, "investor-items": investorItems };
