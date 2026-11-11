# CSR and shared news

Routes: `/{tw,en,jp}/company/csr/`. Header and Footer share Navigation Config.

CSR uses the existing news collection, original URLs, covers, galleries, and videos. No article body is duplicated. Copy and the four topic introductions live in `src/data/csr.json`.

## Add a case

In the existing TW news frontmatter (the structural source), set:

```yaml
featuredInCSR: true
csrCategories:
  - defense-education
  - technology-education
```

Allowed categories: `defense-education`, `disaster-resilience`, `technology-education`, `community-engagement`. Keep translations consistent; the TW entry controls relations for all languages. Only published, nonempty news is selected. A case can carry multiple topics, but is displayed once, under its first topic; all topic tags remain on the card. Turning the flag off removes it from CSR and removes its CSR back links. No page code change is needed.

Initial ARTICLE_IDs:
- `news-23-songshan-school-2025`: defense education.
- `news-20-taipei-education-expo-2026`: defense education and technology education.

Both articles already existed; no articles were added or rewritten. Cover images are still pending upload and use the existing placeholder. Other topics have principle introductions only, with no claimed activities or outcomes.

For EmDash, the same news fields are `featured_in_csr` and `csr_categories`, declared in `seed/seed.json`, carried through the Markdown importer and the content loader. Update an existing CMS schema with these fields before using CMS authoring; this change does not contact or migrate a live CMS.

Validation: `npm run build`, `npm run check`, `npm run qa:csr`, `npm run qa:links`; rebase preview and verify `/bigxreality-web/{lang}/company/csr/`. CSR is registered with the existing indexable-page registry for sitemap and reciprocal hreflang.
