/**
 * Links a term on the skills record to the case files that evidence it.
 *
 * Skill names and work `stack`/`tags` entries were authored separately and do not match verbatim
 * ("Python / Cython" vs "Python", "LQR Control" vs "LQR"). Matching is therefore normalised, with
 * a short alias table for the pairs normalisation alone cannot bridge. A term with no match gets
 * no citation: the record never claims evidence that does not exist.
 */

export interface CitableWork {
  fileNo: number;
  slug: string;
  codename: string;
  stack: string[];
  tags: string[];
}

export interface Citation {
  fileNo: number;
  slug: string;
  codename: string;
}

/** Lowercase and strip everything that is not a letter or digit. */
export function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extra spellings to match a skill against, keyed by the normalised skill name. Each listed
 * alias is itself normalised before comparison.
 */
const ALIASES: Record<string, string[]> = {
  pythoncython: ['python'],
  lqrcontrol: ['lqr'],
  kinematicsdynamics: ['kinematics', 'dynamics'],
  systemmodeling: ['modeling'],
  raspberrypi: ['raspberrypi4'],
  nvidiajetson: ['jetson'],
  machinelearning: ['ml'],
  '3dprinting': ['3dprinting'],
};

/** Every spelling a skill may be recognised by, normalised. */
function spellings(skill: string): string[] {
  const key = normalise(skill);
  return [key, ...(ALIASES[key] ?? []).map(normalise)];
}

/**
 * The case files evidencing `skill`, ordered by file number.
 *
 * A work matches when any of its stack or tag entries normalises to one of the skill's spellings.
 * Comparison is exact rather than substring: "C" must not match "CAD", and "Control" must not
 * match "Control Systems Engineering".
 */
export function citationsFor(skill: string, works: CitableWork[]): Citation[] {
  const wanted = new Set(spellings(skill));

  return works
    .filter((work) =>
      [...work.stack, ...work.tags].some((entry) => wanted.has(normalise(entry))),
    )
    .map((work) => ({ fileNo: work.fileNo, slug: work.slug, codename: work.codename }))
    .sort((a, b) => a.fileNo - b.fileNo);
}

/** Zero-padded file number as the record prints it: 3 -> "003". */
export function formatFileNo(fileNo: number): string {
  return String(fileNo).padStart(3, '0');
}
