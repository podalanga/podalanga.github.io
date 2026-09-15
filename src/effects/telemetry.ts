// Telemetry strip (§7.3): live IST clock, UPTIME since site.ts's epoch, coordinates cycling
// between the two labs, and a fake-but-plausible SIGNAL meter. Plain text ticks, no motion to
// disable under prefers-reduced-motion.
import { formatUptime } from '../lib/dates';

const SIGNAL_PATTERNS = ['▮▮▮▯', '▮▮▯▯', '▮▮▮▮', '▮▯▯▯', '▮▮▮▯'];
const COORD_INTERVAL_MS = 4000;
const SIGNAL_INTERVAL_MS = 2200;

export function initTelemetry(): () => void {
  const strips = Array.from(document.querySelectorAll<HTMLElement>('[data-telemetry]'));
  if (strips.length === 0) return () => {};

  const epochAttr = strips[0].dataset.telemetryEpoch;
  const epoch = epochAttr ? new Date(epochAttr) : new Date();
  const coords = JSON.parse(strips[0].dataset.telemetryCoords ?? '[]') as string[];

  let coordIndex = 0;

  function tick(): void {
    const now = new Date();
    const ist = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
    const uptime = formatUptime(epoch, now);
    for (const strip of strips) {
      const clock = strip.querySelector<HTMLElement>('.telemetry-clock');
      const up = strip.querySelector<HTMLElement>('.telemetry-uptime');
      if (clock) clock.textContent = `${ist} IST`;
      if (up) up.textContent = uptime;
    }
  }

  function tickCoord(): void {
    if (coords.length === 0) return;
    coordIndex = (coordIndex + 1) % coords.length;
    for (const strip of strips) {
      const coord = strip.querySelector<HTMLElement>('.telemetry-coord');
      if (coord) coord.textContent = coords[coordIndex];
    }
  }

  function tickSignal(): void {
    const pattern = SIGNAL_PATTERNS[Math.floor(Math.random() * SIGNAL_PATTERNS.length)];
    for (const strip of strips) {
      const signal = strip.querySelector<HTMLElement>('.telemetry-signal');
      if (signal) signal.textContent = pattern;
    }
  }

  tick();
  tickCoord();
  const clockId = window.setInterval(tick, 1000);
  const coordId = window.setInterval(tickCoord, COORD_INTERVAL_MS);
  const signalId = window.setInterval(tickSignal, SIGNAL_INTERVAL_MS);

  return () => {
    window.clearInterval(clockId);
    window.clearInterval(coordId);
    window.clearInterval(signalId);
  };
}
