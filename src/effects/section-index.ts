import { prefersReducedMotion } from '../lib/reduced-motion';

/**
 * The page's position readout.
 *
 * Two things, one behaviour: the header names the section currently under the
 * fold (`§ 02 INTERNSHIPS`) and a hairline under the header tracks how far
 * through the document you are. It reads as a document/recording position,
 * which is the motif the rest of the site already uses — and it is the only
 * scroll-driven motion on the page, deliberately.
 *
 * Progressive enhancement: with no JS the readout stays empty and the rule
 * stays at zero; every section label is still in the markup.
 */
export function initSectionIndex(): () => void {
  const readout = document.querySelector<HTMLElement>('[data-section-readout]');
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));

  if (sections.length === 0 || (!readout && !progress)) return () => {};

  const reduced = prefersReducedMotion();
  let frame = 0;
  let current = '';

  function paint(no: string, label: string) {
    if (!readout || no === current) return;
    current = no;
    readout.textContent = `§ ${no} ${label}`;
    if (reduced) return;
    // restart the tick: the readout changes like a counter, not a crossfade
    readout.classList.remove('is-ticking');
    void readout.offsetWidth;
    readout.classList.add('is-ticking');
  }

  // The active section is the last one whose top has passed the header line.
  function update() {
    frame = 0;

    // While the loader veil is up, `body > *` is display:none and every section
    // measures at top 0 — which would resolve to the *last* section. Wait for
    // real layout rather than publishing a wrong readout.
    if (document.documentElement.classList.contains('eye-pending')) return;

    if (progress) {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }

    if (!readout) return;
    const line = (document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0) + 1;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) active = section;
      else break;
    }
    paint(active.dataset.section ?? '', active.dataset.sectionLabel ?? '');
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // First paint of the readout happens once the veil lifts and layout is real.
  window.addEventListener('eye:done', schedule);
  update();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('eye:done', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
