import { describe, expect, it } from 'vitest';
import { runCommand, getCompletions, type CommandContext, type WorkSummary } from './commands';

const works: WorkSummary[] = [
  { codename: 'ZBOT', slug: 'zbot', title: 'ZBot', summary: 'Ported a swimming robot sim.', startYear: 2026, endYear: 2026, status: 'completed' },
  { codename: 'PENDULUM', slug: 'rotary-inverted-pendulum', title: 'Pendulum', summary: 'Balances a rotary inverted pendulum.', startYear: 2024, status: 'ongoing' },
];

function ctx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    works,
    email: 'joshuajohn.nitt@gmail.com',
    github: 'https://github.com/podalanga',
    linkedin: 'https://www.linkedin.com/in/joshuajohnl/',
    currentTheme: 'dark',
    now: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('runCommand : empty input', () => {
  it('returns no lines and no action for blank/whitespace input', () => {
    expect(runCommand('', ctx())).toEqual({ lines: [] });
    expect(runCommand('   ', ctx())).toEqual({ lines: [] });
  });
});

describe('runCommand : help', () => {
  it('lists commands', () => {
    const result = runCommand('help', ctx());
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines.some((l) => l.includes('whoami'))).toBe(true);
    expect(result.lines.some((l) => l.startsWith('cd '))).toBe(true);
  });

  it('ends with the Tab hint', () => {
    expect(runCommand('help', ctx()).lines.at(-1)).toMatch(/press Tab/);
  });
});

describe('runCommand : whoami', () => {
  it('gives a short bio', () => {
    const result = runCommand('whoami', ctx());
    expect(result.lines.join(' ')).toMatch(/robotics/i);
  });
});

describe('runCommand : ls works', () => {
  it('lists codenames with year ranges', () => {
    const result = runCommand('ls works', ctx());
    expect(result.lines).toEqual(['ZBOT             2026-2026', 'PENDULUM         2024-PRESENT']);
  });

  it('errors on unknown ls targets', () => {
    const result = runCommand('ls nope', ctx());
    expect(result.lines[0]).toMatch(/unknown target/);
  });
});

describe('runCommand : cat', () => {
  it('shows a case file summary and link, case-insensitively', () => {
    const result = runCommand('cat zbot', ctx());
    expect(result.lines).toEqual(['Ported a swimming robot sim.', '→ /projects/zbot']);
  });

  it('errors when the codename does not exist', () => {
    const result = runCommand('cat nope', ctx());
    expect(result.lines[0]).toBe('cat: nope: no such file');
  });

  it('errors when no codename is given', () => {
    expect(runCommand('cat', ctx()).lines[0]).toMatch(/missing operand/);
  });
});

describe('runCommand : cd', () => {
  it('navigates to section routes', () => {
    const result = runCommand('cd works', ctx());
    expect(result.action).toEqual({ type: 'navigate', href: '/projects' });
  });

  it('no longer answers to open', () => {
    const result = runCommand('open works', ctx());
    expect(result.action).toBeUndefined();
    expect(result.lines[0]).toMatch(/command not found: open/);
  });

  it('navigates to a work by codename', () => {
    const result = runCommand('cd PENDULUM', ctx());
    expect(result.action).toEqual({ type: 'navigate', href: '/projects/rotary-inverted-pendulum' });
  });

  it('errors on unknown targets', () => {
    const result = runCommand('cd nowhere', ctx());
    expect(result.action).toBeUndefined();
    expect(result.lines[0]).toMatch(/not found/);
  });
});

describe('runCommand : contact', () => {
  it('lists email, github, linkedin', () => {
    const result = runCommand('contact', ctx());
    expect(result.lines).toEqual([
      'joshuajohn.nitt@gmail.com',
      'https://github.com/podalanga',
      'https://www.linkedin.com/in/joshuajohnl/',
    ]);
  });
});

describe('runCommand : theme', () => {
  it('reports current theme with no argument', () => {
    const result = runCommand('theme', ctx());
    expect(result.lines[0]).toMatch(/current theme: dark/);
    expect(result.action).toBeUndefined();
  });

  it('triggers a theme action for a valid, different theme', () => {
    const result = runCommand('theme light', ctx());
    expect(result.action).toEqual({ type: 'theme', value: 'light' });
  });

  it('no-ops when already on the requested theme', () => {
    const result = runCommand('theme dark', ctx());
    expect(result.action).toBeUndefined();
    expect(result.lines[0]).toMatch(/already dark/);
  });

  it('rejects an invalid theme name', () => {
    const result = runCommand('theme purple', ctx());
    expect(result.action).toBeUndefined();
  });
});

describe('runCommand : clear', () => {
  it('returns a clear action', () => {
    expect(runCommand('clear', ctx())).toEqual({ lines: [], action: { type: 'clear' } });
  });
});

describe('runCommand : date', () => {
  it('echoes the injected now', () => {
    const result = runCommand('date', ctx());
    expect(result.lines[0]).toBe(ctx().now.toString());
  });
});

describe('runCommand : easter eggs', () => {
  it('sudo is denied and reported, in red', () => {
    const result = runCommand('sudo rm -rf /', ctx());
    expect(result).toEqual({ lines: ['Permission denied. This incident will be reported.'], tone: 'danger' });
  });

  it('2+2 is no longer a command', () => {
    expect(runCommand('2+2', ctx()).lines[0]).toMatch(/command not found/);
  });
});

describe('runCommand : exit', () => {
  it('triggers an exit action with no output lines', () => {
    const result = runCommand('exit', ctx());
    expect(result).toEqual({ lines: [], action: { type: 'exit' } });
  });

  it('is listed in help', () => {
    const result = runCommand('help', ctx());
    expect(result.lines.some((l) => l.includes('exit'))).toBe(true);
  });
});

describe('runCommand : unknown', () => {
  it('reports command not found', () => {
    const result = runCommand('frobnicate', ctx());
    expect(result.lines).toEqual(["command not found: frobnicate. try 'help'"]);
  });
});

describe('getCompletions : command name (first token)', () => {
  it('completes a single unambiguous match with a trailing space', () => {
    expect(getCompletions('o', ctx())).toEqual({ candidates: [] });
    expect(getCompletions('who', ctx())).toEqual({ candidates: ['whoami'], newInput: 'whoami ' });
  });

  it('lists all commands sharing a prefix and does not extend past the shared letters', () => {
    const result = getCompletions('c', ctx());
    expect(result.candidates.sort()).toEqual(['cat', 'cd', 'clear', 'contact']);
    expect(result.newInput).toBeUndefined();
  });

  it('lists every completable command on an empty input', () => {
    const result = getCompletions('', ctx());
    expect(result.candidates.sort()).toEqual(
      ['cat', 'cd', 'clear', 'contact', 'date', 'exit', 'help', 'ls', 'theme', 'whoami'].sort(),
    );
    expect(result.newInput).toBeUndefined();
  });

  it('excludes the hidden sudo and the Tab hint from candidates', () => {
    expect(getCompletions('s', ctx()).candidates).toEqual([]);
    expect(getCompletions('T', ctx()).candidates).toEqual(['theme']);
  });

  it('is a no-op with zero matches', () => {
    expect(getCompletions('zzz', ctx())).toEqual({ candidates: [] });
  });
});

describe('getCompletions : ls argument', () => {
  it('completes "ls w" to "ls works "', () => {
    expect(getCompletions('ls w', ctx())).toEqual({ candidates: ['works'], newInput: 'ls works ' });
  });
});

describe('getCompletions : cat argument', () => {
  it('completes a unique codename prefix, case-insensitively, lower-cased', () => {
    expect(getCompletions('cat z', ctx())).toEqual({ candidates: ['zbot'], newInput: 'cat zbot ' });
  });

  it('lists both codenames on an empty argument without extending the input', () => {
    const result = getCompletions('cat ', ctx());
    expect(result.candidates.sort()).toEqual(['pendulum', 'zbot']);
    expect(result.newInput).toBeUndefined();
  });
});

describe('getCompletions : cd argument', () => {
  it('completes section targets', () => {
    expect(getCompletions('cd w', ctx())).toEqual({ candidates: ['works'], newInput: 'cd works ' });
    expect(getCompletions('cd a', ctx())).toEqual({ candidates: ['archive'], newInput: 'cd archive ' });
  });

  it('completes a codename target alongside section targets', () => {
    expect(getCompletions('cd z', ctx())).toEqual({ candidates: ['zbot'], newInput: 'cd zbot ' });
  });
});

describe('getCompletions : theme argument', () => {
  it('completes a unique theme value', () => {
    expect(getCompletions('theme d', ctx())).toEqual({ candidates: ['dark'], newInput: 'theme dark ' });
  });

  it('lists both theme values on an empty argument', () => {
    const result = getCompletions('theme ', ctx());
    expect(result.candidates.sort()).toEqual(['dark', 'light']);
    expect(result.newInput).toBeUndefined();
  });
});

describe('getCompletions : no-arg commands and out-of-range tokens', () => {
  it('offers no candidates for a second token on a no-arg command', () => {
    expect(getCompletions('whoami x', ctx())).toEqual({ candidates: [] });
    expect(getCompletions('clear ', ctx())).toEqual({ candidates: [] });
  });

  it('offers no candidates for a third token', () => {
    expect(getCompletions('cat zbot x', ctx())).toEqual({ candidates: [] });
  });
});
