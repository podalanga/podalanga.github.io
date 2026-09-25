import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';
import { formatRange } from '../lib/dates';

/** Companion to /llms.txt: every project and post as plain Markdown, in one file. */
export async function GET(_context: APIContext) {
  const p = site.person;
  const works = (await getCollection('works')).sort((a, b) => b.data.start.getTime() - a.data.start.getTime());
  const posts = (await getCollection('log', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const sections = [
    `# ${p.name} (${site.name}): full project write-ups`,
    '',
    `> ${site.description}`,
    '',
    `Source: ${site.url}/ · Author: ${p.name} · Areas: ${site.keywords.join(', ')}`,
    '',
    ...works.flatMap((w) => [
      '---',
      '',
      `# ${w.data.title}`,
      '',
      `- URL: ${site.url}/projects/${w.id}/`,
      `- Author: ${p.name}`,
      `- Type: ${w.data.kind}`,
      `- Organisation: ${w.data.org}, ${w.data.location}`,
      ...(w.data.supervisor ? [`- Supervisor: ${w.data.supervisor}`] : []),
      `- Dates: ${formatRange(w.data.start, w.data.end, w.data.status).replace(' TO ', ' to ')}`,
      `- Stack: ${w.data.stack.join(', ')}`,
      `- Topics: ${w.data.tags.join(', ')}`,
      ...(w.data.metrics ?? []).map((m) => `- ${m.label}: ${m.value}`),
      '',
      w.data.summary,
      '',
      (w.body ?? '').trim(),
      '',
    ]),
    ...posts.flatMap((post) => [
      '---',
      '',
      `# ${post.data.title}`,
      '',
      `- URL: ${site.url}/blog/${post.id}/`,
      `- Author: ${p.name}`,
      `- Published: ${post.data.date.toISOString().slice(0, 10)}`,
      '',
      (post.body ?? '').trim(),
      '',
    ]),
  ];

  return new Response(sections.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
