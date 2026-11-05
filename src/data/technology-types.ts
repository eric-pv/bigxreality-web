export interface TechnologySection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: { title: string; paragraphs: string[] }[];
  bullets?: string[];
  note?: string;
  body?: string;
}
export interface TechnologyPageContent {
  eyebrow: string;
  title: string;
  lead: string;
  intro: string[];
  primaryCta: string;
  secondaryCta: string;
  sections: TechnologySection[];
  relatedTitle: string;
  faq: { question: string; answer: string }[];
  closing: { title: string; body: string; cta: string };
  seo: { title: string; description: string };
}
export interface TechnologyOverviewContent {
  translationStatus?:string;
  eyebrow: string;
  title: string;
  lead: string;
  intro: string[];
  technologies: Record<string, { title: string; description: string }>;
  seo: { title: string; description: string };
}

