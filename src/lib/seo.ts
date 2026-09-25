import { site } from '../config/site';

/** Stable JSON-LD node ids, so every page's graph points at the same Person and WebSite. */
export const PERSON_ID = `${site.url}/#person`;
export const WEBSITE_ID = `${site.url}/#website`;

/** Absolute URL on the site for a root-relative path (or pass-through for an absolute one). */
export function absoluteUrl(path: string): string {
  return new URL(path, site.url).href;
}

/** `<Page> · Joshua John L (Podalanga)`: the pattern every subpage title follows. */
export function pageTitle(page: string): string {
  return `${page} · ${site.person.name} (${site.name})`;
}

export function personNode(image?: string) {
  const p = site.person;
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: p.name,
    givenName: p.givenName,
    alternateName: [...p.alternateName],
    url: `${site.url}/`,
    ...(image && { image }),
    jobTitle: p.jobTitle,
    description: site.description,
    nationality: { '@type': 'Country', name: p.nationality },
    alumniOf: p.alumniOf.map((o) => ({ '@type': 'CollegeOrUniversity', ...o })),
    affiliation: { '@type': 'ResearchOrganization', ...p.affiliation },
    knowsAbout: [...site.keywords],
    sameAs: [site.socials.github, site.socials.linkedin],
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${site.url}/`,
    name: site.name,
    alternateName: [site.person.name, `${site.person.name} Portfolio`],
    description: site.description,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
    author: { '@id': PERSON_ID },
  };
}

export function breadcrumbNode(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

/** YYYY-MM-DD, the form schema.org and sitemaps both accept. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
