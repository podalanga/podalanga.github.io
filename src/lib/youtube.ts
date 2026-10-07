/** The video id of a YouTube watch, short (youtu.be) or embed URL, or null if it is not one. */
export function youtubeId(youtubeUrl: string): string | null {
  try {
    const u = new URL(youtubeUrl);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    const match = u.pathname.match(/\/embed\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * A muted, looping embed. Browsers only allow autoplay when muted, and a single video loops
 * only when it is also its own playlist. `enablejsapi` lets the carousel pause and resume it.
 */
export function loopEmbedUrl(id: string, { controls = true, autoplay = true } = {}): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: '1',
    loop: '1',
    playlist: id,
    playsinline: '1',
    rel: '0',
    controls: controls ? '1' : '0',
    enablejsapi: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
