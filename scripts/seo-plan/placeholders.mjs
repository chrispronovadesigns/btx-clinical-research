/**
 * The copy scripts/seo-plan/scaffold.mjs writes into a new page.
 *
 * A scaffolded page is `noindex` until its copy is final. audit-build.mjs fails the build when ANY of these
 * strings is still on an INDEXABLE page, so a page cannot be published (noindex removed, or an older scaffold
 * that never had it) while it still says "Question one" or "$X,XXX". The literal "TODO" check alone missed this:
 * nine Spanish pages on pronova-website went live with this copy and an English <html lang>.
 *
 * Keep every entry free of apostrophes and entities (the built html encodes them).
 * tests/unit/scripts/placeholders.test.ts fails if scaffold.mjs stops emitting one of these, so the guard
 * cannot drift from the template.
 */
export const PLACEHOLDER_SENTINELS = [
  'Question one',
  'Answer it honestly',
  'Feature one',
  'Capability one',
  'Describe the first capability',
  '$X,XXX',
];
