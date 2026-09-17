// Terminal command parser (§7.1): pure so it's unit-testable without a DOM. `Terminal.astro`
// embeds the site's work list as JSON; `terminal.ts` deserializes it into a CommandContext,
// calls `runCommand`, and applies the returned `action` (navigate / theme / clear) itself.

export interface WorkSummary {
  codename: string;
  slug: string;
  title: string;
  summary: string;
  startYear: number;
  endYear?: number;
  status: 'ongoing' | 'completed';
}

export interface CommandContext {
  works: WorkSummary[];
  email: string;
  github: string;
  linkedin: string;
  currentTheme: 'dark' | 'light';
  now: Date;
}

export type CommandAction =
  | { type: 'navigate'; href: string }
  | { type: 'theme'; value: 'dark' | 'light' }
  | { type: 'clear' }
  | { type: 'exit' };

export interface CommandResult {
  lines: string[];
  action?: CommandAction;
}

export interface CompletionResult {
  candidates: string[];
  newInput?: string;
}

const HELP_LINES = [
  'help                 : list commands',
  'whoami               : short bio',
  'ls works             : list case files',
  'cat <codename>       : show a case file summary',
  'open <target>        : navigate (works | archive | log | a codename)',
  'contact              : email / github / linkedin',
  'theme [dark|light]   : switch theme',
  'clear                : clear the screen',
  'date                 : current date/time',
  'exit                 : ?????',
];

function findWork(ctx: CommandContext, codename: string): WorkSummary | undefined {
  const needle = codename.toLowerCase();
  return ctx.works.find((w) => w.codename.toLowerCase() === needle);
}

function yearRange(w: WorkSummary): string {
  return w.status === 'ongoing' || !w.endYear ? `${w.startYear}-PRESENT` : `${w.startYear}-${w.endYear}`;
}

// Derived from HELP_LINES (not a separately maintained list) so hidden easter eggs like
// `sudo`/`2+2` never appear as tab-completion candidates, without having to remember to
// keep two lists in sync.
const COMPLETABLE_COMMANDS = HELP_LINES.map((line) => line.trim().split(/\s+/)[0]);

function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
    prefix = prefix.slice(0, i);
    if (prefix === '') break;
  }
  return prefix;
}

export function runCommand(raw: string, ctx: CommandContext): CommandResult {
  const input = raw.trim();
  if (input === '') return { lines: [] };

  const parts = input.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1);

  if (cmd === 'sudo') {
    return { lines: ['PERMISSION DENIED. THIS INCIDENT WILL BE REPORTED.'] };
  }

  if (input.replace(/\s+/g, '') === '2+2') {
    return { lines: ['5'] };
  }

  switch (cmd) {
    case 'help':
      return { lines: HELP_LINES };

    case 'whoami':
      return {
        lines: [
          'Joshua John L, robotics / control-systems engineer.',
          'NIT Trichy (Instrumentation & Control) + IIT Madras (BS Data Science).',
          'Building machines that balance, swim and see.',
        ],
      };

    case 'ls':
      if (rest[0]?.toLowerCase() === 'works') {
        if (ctx.works.length === 0) return { lines: ['(no case files loaded)'] };
        return { lines: ctx.works.map((w) => `${w.codename.padEnd(16)} ${yearRange(w)}`) };
      }
      return { lines: [`ls: unknown target '${rest[0] ?? ''}'. try 'ls works'`] };

    case 'cat': {
      const codename = rest[0];
      if (!codename) return { lines: ["cat: missing operand. try 'cat <codename>'"] };
      const work = findWork(ctx, codename);
      if (!work) return { lines: [`cat: ${codename}: no such file`] };
      return { lines: [work.summary, `→ /projects/${work.slug}`] };
    }

    case 'open': {
      const target = rest[0]?.toLowerCase();
      if (!target) return { lines: ["open: missing operand. try 'open works'"] };
      const routes: Record<string, string> = { works: '/projects', archive: '/archive', log: '/blog' };
      if (target in routes) {
        return { lines: [`opening ${routes[target]}...`], action: { type: 'navigate', href: routes[target] } };
      }
      const work = findWork(ctx, target);
      if (work) {
        return { lines: [`opening /projects/${work.slug}...`], action: { type: 'navigate', href: `/projects/${work.slug}` } };
      }
      return { lines: [`open: ${rest[0]}: not found`] };
    }

    case 'contact':
      return { lines: [ctx.email, ctx.github, ctx.linkedin] };

    case 'theme': {
      const value = rest[0]?.toLowerCase();
      if (!value) return { lines: [`current theme: ${ctx.currentTheme}. try 'theme dark' or 'theme light'`] };
      if (value !== 'dark' && value !== 'light') {
        return { lines: [`theme: '${value}' is not 'dark' or 'light'`] };
      }
      if (value === ctx.currentTheme) return { lines: [`already ${value}`] };
      return { lines: [`switching to ${value}...`], action: { type: 'theme', value } };
    }

    case 'clear':
      return { lines: [], action: { type: 'clear' } };

    case 'date':
      return { lines: [ctx.now.toString()] };

    case 'exit':
      return { lines: [], action: { type: 'exit' } };

    default:
      return { lines: [`command not found: ${cmd}. try 'help'`] };
  }
}

export function getCompletions(raw: string, ctx: CommandContext): CompletionResult {
  const trailingSpace = raw === '' || /\s$/.test(raw);
  const trimmed = raw.trim();
  const tokens = trimmed === '' ? [] : trimmed.split(/\s+/);

  const priorTokens = trailingSpace ? tokens : tokens.slice(0, -1);
  const activePrefix = trailingSpace ? '' : (tokens[tokens.length - 1] ?? '');
  const activeIndex = priorTokens.length;

  if (activeIndex >= 2) return { candidates: [] };

  let pool: string[];
  if (activeIndex === 0) {
    pool = COMPLETABLE_COMMANDS;
  } else {
    const cmd = priorTokens[0].toLowerCase();
    const codenames = ctx.works.map((w) => w.codename.toLowerCase());
    if (cmd === 'ls') pool = ['works'];
    else if (cmd === 'cat') pool = codenames;
    else if (cmd === 'open') pool = ['works', 'archive', 'log', ...codenames];
    else if (cmd === 'theme') pool = ['dark', 'light'];
    else pool = [];
  }

  const needle = activePrefix.toLowerCase();
  const matches = pool.filter((c) => c.startsWith(needle));
  if (matches.length === 0) return { candidates: [] };

  const prefixBase = priorTokens.length ? `${priorTokens.join(' ')} ` : '';

  if (matches.length === 1) {
    return { candidates: matches, newInput: `${prefixBase}${matches[0]} ` };
  }

  const lcp = longestCommonPrefix(matches);
  const newInput = lcp.length > activePrefix.length ? `${prefixBase}${lcp}` : undefined;
  return { candidates: matches, newInput };
}
