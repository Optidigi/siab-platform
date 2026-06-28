# Amicare And Amblast Legacy Renderer Parity Inventory

## Acceptance Contract

- Legacy tenant output must be selected only by tenant slug/domain/settings.
- Legacy components are tenant-exclusive and must not be exported into the
  reusable generation block catalog.
- Snapshot data remains structured. Exact HTML, classes, CSS, and behavior live
  in `packages/site-renderer/src/legacy-tenants/*`.
- Generic generated sites must not receive `data-legacy-tenant`, Amicare
  classes, Amblast `amb-*` page structures, or tenant-exclusive behavior.
- Unavoidable differences require explicit review before staging.

## Amicare

Current implementation target:

- Renderer directory: `packages/site-renderer/src/legacy-tenants/amicare`
- Dispatch root: `data-legacy-tenant="amicare"`
- Source CSS contract: `removed legacy Amicare app source/src/styles/global.css` and
  `removed legacy Amicare app source/src/styles/rich-text.css`
- Source behavior contract:
  `removed legacy Amicare app source/src/components/Nav.tsx`,
  `removed legacy Amicare app source/src/components/CookieConsent.astro`, and
  `removed legacy Amicare app source/src/lib/analytics/runtime.ts`

| Area | Source file | Renderer mapping | CSS dependency | JS behavior | Editable fields | Fixed structural fields | Media |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Page shell | `layouts/BaseLayout.astro` | `AmicarePageRenderer` | Amicare root tokens, site-frame container | analytics config script, cookie consent script | site name, language, theme, analytics | root, main, footer order | favicon not yet rendered by React shell |
| Navigation | `components/Nav.tsx` | `AmicareNav` | exact nav utility classes and Amicare tokens | active section script, CSS checkbox mobile menu | brand, logo, nav links | sticky nav structure, anchor mode | header logo |
| Maintenance | `components/MaintenanceBanner.astro` | `AmicareMaintenanceBanner` | exact banner utility classes | none | message, enabled | banner placement | none |
| Hero | `components/cms/Hero.tsx` | `AmicareHero` | exact section/card utility classes, animations | none | eyebrow, headline, subheadline, pills, CTA | pull quote, Roermond card, section layout | hero image |
| Feature list | `components/cms/FeatureList.tsx` | `AmicareFeatureList` | exact care-card utility classes | none | title, intro, features, icons | three-card layout | icons only |
| Rich text | `components/cms/RichText.tsx`, `RtNodeRenderer.tsx` | `AmicareRichText` using shared `RichTextRenderer` | scoped `rt-*` selectors | none | rich text body | prose wrapper, `#over` fallback | inline rich text only |
| Quote/contact CTA | `components/cms/CTA.tsx` | `AmicareCTA` | exact quote/contact utility classes | none | eyebrow, headline, description, links | quote/contact variant rule by href | background image |
| Testimonials | `components/cms/Testimonials.tsx` | `AmicareTestimonials` | exact card utility classes | none | title, quote, author, role | card grid | avatar |
| FAQ | `components/cms/FAQ.tsx` | `AmicareFAQ` | exact accordion utility classes | native details/summary | title, items | details structure | none |
| Contact form | `components/cms/ContactSection.tsx` | `AmicareContactSection` | exact form utility classes | browser form submit | form name, labels, fields, submit label | `/api/forms` action unless preview overrides | none |
| Footer | `components/Footer.astro` | `AmicareFooter` | exact footer utility classes | none | brand, logo, email, columns, nav, business data | footer grid and copyright placement | footer logo |

Open Amicare parity checks:

- Browser screenshot diff against `removed legacy Amicare app source` desktop and mobile.
- Mobile menu visual behavior against Framer Motion source behavior.
- Analytics runtime parity beyond consent/config bootstrap. The current port
  emits config and consent methods, but does not yet port the full PostHog,
  pageview/pageleave, web vitals, section, component, and form tracking runtime.
- Cookie consent accept/decline persistence and analytics side effects.
- Contact form provider metadata parity: hidden fields, honeypot, max lengths,
  success/error messages, and analytics flags from snapshot data.
- Favicon/manifest/apple touch/sitemap/JSON-LD metadata in the renderer
  document shell.
- Font parity for Fraunces, Inter, and Caveat, and computed-style verification
  against generic `.cms-block*` renderer rules.

## Amblast

Current implementation target:

- Renderer directory: `packages/site-renderer/src/legacy-tenants/amblast`
- Dispatch root: `data-legacy-tenant="amblast"`
- Static fragment source: `removed legacy Amblast app source/dist` generated after
  `pnpm renderer:build`
- Source CSS contract: `removed legacy Amblast app source/src/styles/global.css` and
  `removed legacy Amblast app source/src/styles/amb-base.css`
- Source behavior contract: `removed legacy Amblast app source/src/scripts/site.client.ts`
- Current renderer approach: exact compiled page fragments are embedded in
  `legacy-html.ts`, scoped `amb-base.css` is imported under the Amblast root,
  and `AmblastPageRenderer` selects the fragment by page slug.

| Page/area | Source file | CSS dependency | JS dependency | Editable fields | Fixed structural fields | Media dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| Layout shell | `layouts/BaseLayout.astro` | scoped `amb-base.scoped.css`; generic document CSS still differs | renderer bootstrap plus handwritten behavior replacement | SEO title/description, body class, preload image in snapshot but not all consumed | `#amb-page-flag`, `#content`, body classes duplicated onto wrapper, not `<body>` | favicon, icons, webfonts |
| Header | `components/layout/Header.astro` | scoped `amb-base.scoped.css` | mobile nav toggle replacement | static fragment currently owns logo/nav labels/hrefs/contact CTA | `amb-el-*`, menu IDs, `data-settings`, current item classes | logo image/srcset via `/uploads/...` |
| Footer | `components/layout/Footer.astro` | scoped `amb-base.scoped.css` | none | static fragment currently owns logo, tagline, menu, contact/business data | Elementor-style columns and widget wrappers | logo |
| Home | `pages/index.astro` | scoped `amb-base.scoped.css` | animation marker replacement, simple carousel replacement | structured snapshot fields exist but fragment currently owns output | `data-id`, shape dividers, section nesting | hero, icons, service-card images |
| Over ons | `pages/over-ons.astro` | scoped `amb-base.scoped.css` | animation marker replacement | structured snapshot fields exist but fragment currently owns output | exact Elementor sections and widget wrappers | portrait/hero images |
| Diensten | `pages/diensten.astro` | scoped `amb-base.scoped.css` | animation marker replacement | structured snapshot fields exist but fragment currently owns output | exact section split and `amb-*` classes | service images/icons |
| Portfolio | `pages/portfolio.astro` | scoped `amb-base.scoped.css` | before/after comparison replacement | structured snapshot fields exist but fragment currently owns output | comparison DOM, handles, wrappers | before/after images |
| Contact | `pages/contact.astro` | scoped `amb-base.scoped.css` | contact form fallback only | structured Web3Forms provider fields exist but fragment currently owns output | fallback form/content wrappers; hidden provider fields not rendered | optional background/icons |

Required Amblast port notes:

- Preserve original `amb-*` classes, `data-id`, `data-settings`, section
  hierarchy, shape-divider SVGs, and body classes. Current body classes are
  duplicated onto `#amb-page-flag`; exact `<body>` parity remains open.
- Port or deliberately replace `site.client.ts` behavior for mobile navigation,
  animations, carousel/pagination, before/after comparison, and forms. Current
  renderer uses lightweight replacements, not Swiper.
- Keep scoped `amb-base.css` under `data-legacy-tenant="amblast"` and continue
  verifying `/uploads/...`, favicon, manifest, and webfont asset resolution.
- Do not expose Amblast sections as reusable catalog blocks.

Open Amblast parity checks:

- Browser screenshot diff for `/`, `/over-ons`, `/diensten`, `/portfolio`,
  and `/contact` at desktop and mobile.
- Static DOM parity against `removed legacy Amblast app source/dist` for all five pages.
- Contact form decision: exact built fallback versus Web3Forms-enabled snapshot
  form markup.
- Head parity for favicons, manifest, theme color, canonical, OG/Twitter,
  preloads, and JSON-LD.
- Carousel behavior parity against Swiper loop, autoplay, breakpoints,
  pagination, touch drag, and auto height.
- Before/after pointer behavior on desktop and mobile.
- Snapshot editability parity: structured fixture data exists, but current
  Amblast renderer output is selected by slug and mostly bypasses page blocks.
