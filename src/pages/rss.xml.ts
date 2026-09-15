import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { site } from '../config/site';

export async function GET(context: APIContext) {
  const posts = await getCollection('log', ({ data }) => !data.draft);
  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: posts
      .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        link: `/log/${post.id}`,
      })),
  });
}
