import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';
import { formatRange } from '../lib/dates';

/**
 * llms.txt (https://llmstxt.org): a plain-Markdown map of the site for AI agents and answer
 * engines, which otherwise have to run the canvas effects to find the content. Built from the
 * same collections as the pages, so it never drifts.
 */
export async function GET(_context: APIContext) {
  const p = site.person;
  const works = (await getCollection('works')).sort((a, b) => b.data.start.getTime() - a.data.start.getTime());
  const posts = (await getCollection('log', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  const education = (await getCollection('education')).sort((a, b) => a.data.order - b.data.order);

  const lines = [
    `# ${p.name} (${site.name})`,
    '',
    `> ${site.description}`,
    '',
    `${p.name}, also known online as "${site.name}", is a ${p.jobTitle.toLowerCase()}. Tagline: "${site.tagline}"`,
    '',
    '## Profile',
    '',
    `- Name: ${p.name} (also: ${p.alternateName.join(', ')})`,
    `- Role: ${p.jobTitle}`,
    ...education.map((e) => `- Education: ${e.data.degree}, ${e.data.institution} (${e.data.start} to ${e.data.end})`),
    `- Research internship: ${p.affiliation.name}`,
    `- Website: ${site.url}/`,
    `- GitHub: ${site.socials.github}`,
    `- LinkedIn: ${site.socials.linkedin}`,
    '',
    '## Areas of expertise',
    '',
    site.keywords.join(', '),
    '',
    '## Projects',
    '',
    ...works.map(
      (w) =>
        `- [${w.data.title}](${site.url}/projects/${w.id}): ${w.data.summary} (${w.data.org}, ${formatRange(w.data.start, w.data.end, w.data.status).replace(' TO ', ' to ')}; ${w.data.stack.join(', ')})`,
    ),
    '',
    '## Blog',
    '',
    ...posts.map((post) => `- [${post.data.title}](${site.url}/blog/${post.id}): ${post.data.description}`),
    '',
    '## Optional',
    '',
    `- [Full text of every project write-up](${site.url}/llms-full.txt)`,
    `- [Photography archive](${site.url}/archive)`,
    `- [RSS feed](${site.url}/rss.xml)`,
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
