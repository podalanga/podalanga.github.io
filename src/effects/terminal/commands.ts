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
  | { type: 'clear' };

export interface CommandResult {
  lines: string[];
  action?: CommandAction;
}

const HELP_LINES = [
  'help                 — list commands',
  'whoami               — short bio',
  'ls works             — list case files',
  'cat <codename>       — show a case file summary',
  'open <target>        — navigate (works | archive | log | a codename)',
  'contact              — email / github / linkedin',
  'theme [dark|light]   — switch theme',
  'clear                — clear the screen',
  'date                 — current date/time',
];

function findWork(ctx: CommandContext, codename: string): WorkSummary | undefined {
  const needle = codename.toLowerCase();
  return ctx.works.find((w) => w.codename.toLowerCase() === needle);
}

function yearRange(w: WorkSummary): string {
  return w.status === 'ongoing' || !w.endYear ? `${w.startYear}–PRESENT` : `${w.startYear}–${w.endYear}`;
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
          'Joshua John L — robotics / control-systems engineer.',
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
      return { lines: [work.summary, `→ /profile/${work.slug}`] };
    }

    case 'open': {
      const target = rest[0]?.toLowerCase();
      if (!target) return { lines: ["open: missing operand. try 'open works'"] };
      const routes: Record<string, string> = { works: '/profile', archive: '/archive', log: '/blog' };
      if (target in routes) {
        return { lines: [`opening ${routes[target]}...`], action: { type: 'navigate', href: routes[target] } };
      }
      const work = findWork(ctx, target);
      if (work) {
        return { lines: [`opening /profile/${work.slug}...`], action: { type: 'navigate', href: `/profile/${work.slug}` } };
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

    default:
      return { lines: [`command not found: ${cmd}. try 'help'`] };
  }
}
