# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Saad Hossain's personal academic/portfolio site, served by GitHub Pages straight from the repo root on `main`. There is no client-side JavaScript; it's static HTML + CSS produced by a small TypeScript build script.

**The root-level `index.html`, `experience.html`, `publications.html`, and `cv.html` are generated output, but they're committed because Pages serves them.** Never hand-edit them. Edit `data/` or `templates/`, rebuild, and commit the source change together with the regenerated HTML.

## Commands

```bash
npm install          # one-time: typescript, ts-node, @types/node
npm run build        # ts-node src/build.ts → regenerates the 4 root *.html files
npx tsc --noEmit     # type-check src/build.ts
```

- `npm run watch` passes `--watch`, but `build.ts` ignores that flag, so it just builds once.
- There are no tests, linter, or formatter. To check a change, rebuild and open the HTML (or serve the root with any static server).

## Build pipeline (`src/build.ts`)

1. Loads `data/*.json` (`profile`, `news`, `experience`, `publications`, `navigation`).
2. Preprocesses the data:
   - **Venue badge class.** Each publication gets a `venueClass` from its `venue` string: contains `@` or "workshop" → `workshop`; matches the `JOURNALS` regex (`pami|ajem|ijcv|tmlr|journal`) → `journal`; anything else → `conference`. A new journal venue needs its abbreviation added to `JOURNALS`, or it'll show as a conference. These map to `.pub-venue--*` styles in `css/pages/publications.css`.
   - **Link icons.** Each link gets a Font Awesome `icon` looked up by its uppercased `label` in `LINK_ICONS` (PAPER, CODE, EVENT, ARTICLE, TALK, WEBINAR, WORKSHOP, PRESS). Unknown labels get a generic external-link icon. ARTICLE shows an award icon; use PRESS for news coverage.
   - **Press quotes.** A `panelsAndMedia` entry can have an optional `quote`, which renders as a `.pub-quote` pull quote. Use it only for verbatim quotes attributed to Saad, and give those entries the role `Quoted`.
   - **Featured publications.** `featuredPublications` is the **first 3 entries** of `publications.json`, so array order decides what shows on the homepage.
   - **News dates.** Written as `MM/DD/YY` in `news.json` and rendered as `Mon YYYY`. Items render in file order, newest first.
3. Renders each entry in the hard-coded `pages` array (`templates/<name>.html`) and writes the result to `<name>.html` at the repo root. Every page receives all the data, plus `navigation` (with `isActive` set from `activeNav`) and `pageTitle`.

To add a page: create `templates/<name>.html`, add it to `pages` in `build.ts`, and add a nav entry to `data/navigation.json` whose `id` matches `activeNav`.

## Template engine (custom, Handlebars-like)

`TemplateEngine` in `build.ts` is hand-rolled and supports only:

- `{{> partialName}}` includes a file from `templates/partials/` (`head`, `navbar`)
- `{{var}}` and `{{a.b.c}}` insert values
- `{{#each path}}…{{/each}}` loops (nesting works). Item fields are merged into the parent scope, `{{this}}` gives the item for primitive arrays, and `@index`, `@first`, `@last` are available.
- `{{#if path}}…{{else}}…{{/if}}` conditionals

Gotchas:
- **Values are not HTML-escaped.** The data deliberately contains inline HTML (`<a>` in `profile.bio`, `<u>`/`<i>` in news, and `<u>S. Hossain</u>` in `authors`). Plain text with `<` or `&` must be escaped in the JSON by hand.
- `{{#if}}` uses a non-greedy regex, so an `{{#if}}` nested inside another `{{#if}}` breaks. Put conditionals inside `{{#each}}` blocks instead, or keep them flat.
- Missing variables silently render as an empty string.
- The TS interfaces don't match the JSON exactly (`profile.bio` is a `string[]` of paragraphs, and `profile.title` isn't declared). Nothing validates the JSON, so check that the rendered output looks right.
- Publication `authors` is stored but not rendered by any current template.

## CSS

- `templates/partials/head.html` loads `css/base.css` (design tokens on `:root`, typography, the sticky frosted nav, layout) and `css/components.css` (shared cards, pills, the `stagger` animation) on every page. It also loads Plus Jakarta Sans (Google Fonts) and Font Awesome 6 (cdnjs).
- Each template links its own `css/pages/<page>.css` in `<head>`. `index.html` also loads `pages/publications.css` because its featured-publication cards reuse those styles.
- The top-level `css/styles.css`, `css/cv.css`, `css/experience.css`, and `css/publications.css` are legacy files that nothing references.
- The theme is light-only (no dark mode). Mobile breakpoints are around 640px and 767/768px.

## Design rules (from the owner's past feedback)

The look is adapted from [mkowal2.github.io](https://github.com/MKowal2/mkowal2.github.io), in monochrome.

- **Keep every page consistent.** Colours, accents, and header treatment must match across About, Experience, Publications, and Resume. Never restyle one page on its own.
- **No colour accents.** The palette is the grays plus a slate accent (`--color-accent` / `--color-accent-dark` in `base.css`). Gold/amber was tried and rejected. The only colours on the site are the venue badges (blue = conference, green = journal, purple = workshop) and brand icons.
- **Section headings.** Every `<h2>` uses the short slate accent bar from `h2::after` in `base.css`. Don't add full-width border lines.
- **Dates are plain text.** Normal case, muted gray, never `text-transform: uppercase` with letter-spacing.
- **Publication cards.** Show a one-line `tldr` and no author list. Write venues without a comma before the year (`KDD 2026`). Awards such as "Oral" go in `note`, which renders as the muted `badge-note`.
- **Navigation.** The site uses a top nav with separate pages. An older left-sidebar layout was removed; don't bring it back.
- **Thumbnails** in `images/thumbs/` are 660×440 (3:2). Figures and logos are padded onto white; photos are center-cropped.
- **Checking mobile.** Use real device emulation (CDP `Emulation.setDeviceMetricsOverride` with `mobile: true`). A plain headless `--window-size` screenshot renders a wider viewport and shows horizontal clipping that isn't really there.

## Resume / CV

- The Resume page embeds `assets/cv.pdf` in an iframe, and the hero's "CV" link points to the same file. Updating the CV doesn't need a site rebuild.
- The LaTeX sources, the info bank and the checking tools live in `.assets/`, which is gitignored and must stay out of git. Their rules are in `.assets/CLAUDE.md`; read it before touching any resume or `assets/cv.pdf`. Keep private details out of this file, since it's public once committed.
