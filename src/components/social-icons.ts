import { site } from '../config/site';

/**
 * Icon glyphs, 24x24 nominal viewBox. `viewBox` below is each glyph's own
 * true getBBox() (measured, +10% padding) rather than the nominal 0..24 box
 * — several of these marks (the LinkedIn glyph especially) don't actually
 * fill that full square, so centering on the nominal box reads visibly
 * off-centre; centering on the real ink does not.
 */
export const ICONS = {
  email: {
    d: 'M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5zM4 6.6v.8l8 5.6 8-5.6v-.8l-8 5.6zM4 9.5V18h16V9.5l-8 5.6z',
    viewBox: '1 1 22 22',
  },
  github: {
    d: 'M12 2C6.48 2 2 6.58 2 12.19c0 4.49 2.87 8.3 6.84 9.64.5.1.68-.22.68-.49 0-.24-.01-1.03-.01-1.87-2.78.61-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.54 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.95.68 1.92 0 1.39-.01 2.51-.01 2.85 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.19C22 6.58 17.52 2 12 2z',
    viewBox: '1 0.98 22 22',
  },
  linkedin: {
    d: 'M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.1 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.25h4.5V23H.24zM8.14 8.25h4.31v2.01h.06c.6-1.13 2.06-2.33 4.24-2.33 4.53 0 5.37 2.98 5.37 6.86V23h-4.5v-6.36c0-1.52-.03-3.47-2.11-3.47-2.12 0-2.44 1.65-2.44 3.36V23h-4.5z',
    viewBox: '-1.11 -0.17 24.33 24.33',
  },
} as const;

export const LINKS = [
  { key: 'email', label: 'Email', href: undefined, icon: ICONS.email },
  { key: 'github', label: 'GitHub', href: site.socials.github, icon: ICONS.github },
  { key: 'linkedin', label: 'LinkedIn', href: site.socials.linkedin, icon: ICONS.linkedin },
] as const;
