import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { PUBLISHED_PERMALINKS } from '../../config/permalinks';
import { permalinkRoutes } from '../../lib/documents';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Every named upload, published at /docs/<name>.<ext> whatever its file is called. External ones are forwarded by [name].astro. */
export async function getStaticPaths() {
  const works = await getCollection('works');
  const documents = works.flatMap((work) => work.data.documents ?? []);
  return permalinkRoutes(documents, PUBLISHED_PERMALINKS)
    .filter((route) => !route.external)
    .map((route) => ({ params: { file: route.name }, props: { source: route.file } }));
}

export async function GET({ params, props }: APIContext<{ source: string }>) {
  // Resolved from the project root: the bundled build runs from a different folder than src/.
  const body = await readFile(join(process.cwd(), 'public', props.source));
  const ext = params.file?.split('.').pop() ?? '';
  return new Response(body, { headers: { 'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream' } });
}
