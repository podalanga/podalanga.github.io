/**
 * The page's scroll-position hairline under the header, tracking how far
 * through the document you are. It reads as a document/recording position,
 * which is the motif the rest of the site already uses — and it is the only
 * scroll-driven motion on the page, deliberately.
 *
 * Progressive enhancement: with no JS the rule stays at zero.
 */
export function initSectionIndex(): () => void {
  const progress = document.querySelector<HTMLElement>('[data-scroll-progress]');

  if (!progress) return () => {};

  let frame = 0;

  function update() {
    frame = 0;

    // While the loader veil is up, `body > *` is display:none and layout
    // isn't real yet. Wait for the veil to lift before painting the hairline.
    if (document.documentElement.classList.contains('eye-pending')) return;

    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progress!.style.transform = `scaleX(${ratio})`;
  }

  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(update);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  // First paint happens once the veil lifts and layout is real.
  window.addEventListener('eye:done', schedule);
  update();

  return () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('eye:done', schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
