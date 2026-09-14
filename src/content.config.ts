import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const works = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      codename: z.string(),
      fileNo: z.number(),
      kind: z.enum(['internship', 'project', 'competition']),
      org: z.string(),
      location: z.string(),
      supervisor: z.string().optional(),
      start: z.coerce.date(),
      end: z.coerce.date().optional(),
      status: z.enum(['ongoing', 'completed']),
      summary: z.string(),
      tags: z.array(z.string()),
      stack: z.array(z.string()),
      metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      figures: z
        .array(z.object({ src: image(), caption: z.string() }))
        .optional(),
      featured: z.boolean(),
      classified: z.array(z.string()).optional(),
    }),
});

const archive = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/archive' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        kind: z.enum(['photo', 'video']),
        category: z.enum(['photography', 'music', 'misc']),
        date: z.coerce.date(),
        location: z.string().optional(),
        image: image().optional(),
        alt: z.string().optional(),
        youtube: z.string().url().optional(),
        caption: z.string().optional(),
        tags: z.array(z.string()),
      })
      .refine((entry) => (entry.kind === 'photo' ? !!entry.image : true), {
        message: 'archive entries with kind "photo" require an image',
      })
      .refine((entry) => (entry.kind === 'video' ? !!entry.youtube : true), {
        message: 'archive entries with kind "video" require a youtube url',
      }),
});

const log = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/log' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      description: z.string(),
      tags: z.array(z.string()),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      attachments: z
        .array(z.object({ label: z.string(), file: z.string() }))
        .optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { works, archive, log };
