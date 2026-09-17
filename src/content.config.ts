import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Sveltia CMS writes '' for a cleared optional field instead of omitting the key. */
function optional<S extends { optional(): unknown }>(schema: S): ReturnType<S['optional']> {
  return z.preprocess(
    (val) => (val === '' ? undefined : val),
    schema.optional() as never,
  ) as ReturnType<S['optional']>;
}

const works = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/works' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      codename: z.string(),
      fileNo: z.number(),
      kind: z.enum(['internship', 'project', 'competition', 'hobby']),
      org: z.string(),
      location: z.string(),
      supervisor: z.string().optional(),
      start: z.coerce.date(),
      end: optional(z.coerce.date()),
      status: z.enum(['ongoing', 'completed']),
      summary: z.string(),
      tags: z.array(z.string()),
      stack: z.array(z.string()),
      metrics: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      cover: optional(image()),
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
        image: optional(image()),
        alt: z.string().optional(),
        youtube: optional(z.string().url()),
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
      updated: optional(z.coerce.date()),
      description: z.string(),
      tags: z.array(z.string()),
      cover: optional(image()),
      coverAlt: z.string().optional(),
      attachments: z
        .array(z.object({ label: z.string(), file: z.string() }))
        .optional(),
      draft: z.boolean().default(false),
    }),
});

const education = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/education' }),
  schema: z.object({
    order: z.number(),
    institution: z.string(),
    degree: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
    detail: z.string(),
    coursework: z.array(z.string()),
  }),
});

const skills = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/skills' }),
  schema: z.object({
    order: z.number(),
    label: z.string(),
    /**
     * A term on the record. `tier` drives the ramp at the top of the section: 1 is the largest,
     * 3 the smallest, and an untiered term appears only in the index below the fold. Bare strings
     * are still accepted so a CMS round-trip that drops `tier` cannot break the build.
     */
    items: z.array(
      z.union([
        z.string().transform((name) => ({ name, tier: undefined as number | undefined })),
        z.object({
          name: z.string(),
          tier: optional(z.number().int().min(1).max(3)),
        }),
      ]),
    ),
  }),
});

const positions = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/positions' }),
  schema: z.object({
    order: z.number(),
    role: z.string(),
    org: z.string(),
    start: z.string(),
    end: z.string(),
    detail: z.string(),
  }),
});

const awards = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/awards' }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    detail: z.string(),
  }),
});

export const collections = { works, archive, log, education, skills, positions, awards };
