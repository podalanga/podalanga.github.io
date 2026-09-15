// Header IST clock (§3.3). Kept in the same init-on-`astro:page-load` / teardown-on-`astro:before-swap`
// lifecycle as the other per-page effects; a plain inline `<script>` in Header.astro only runs
// once (Astro's router doesn't re-execute an unchanged script across soft navs), which used to
// leave the clock frozen and blank after the first navigation.
export function initHeaderClock(): () => void {
  const clock = document.getElementById('ist-clock');
  if (!clock) return () => {};

  function tick(): void {
    const now = new Date();
    const ist = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
    clock!.textContent = `${ist} IST`;
    clock!.setAttribute('datetime', now.toISOString());
  }

  tick();
  const id = window.setInterval(tick, 1000);

  return () => window.clearInterval(id);
}
