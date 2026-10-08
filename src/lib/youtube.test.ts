import { describe, expect, it } from 'vitest';
import { loopEmbedUrl, youtubeId, youtubePoster } from './youtube';

describe('youtubeId', () => {
  it('reads watch, short and embed URLs', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dhshj_wPEz8')).toBe('dhshj_wPEz8');
    expect(youtubeId('https://youtu.be/M3oqJB_sfAk')).toBe('M3oqJB_sfAk');
    expect(youtubeId('https://www.youtube.com/embed/M3oqJB_sfAk?rel=0')).toBe('M3oqJB_sfAk');
  });

  it('returns null for anything else', () => {
    expect(youtubeId('not a url')).toBeNull();
    expect(youtubeId('https://example.com/video')).toBeNull();
    expect(youtubeId('https://youtu.be/')).toBeNull();
  });
});

describe('loopEmbedUrl', () => {
  it('autoplays muted and loops the video as its own playlist', () => {
    const url = new URL(loopEmbedUrl('abc123'));
    expect(url.hostname).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/abc123');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('loop')).toBe('1');
    expect(url.searchParams.get('playlist')).toBe('abc123');
    expect(url.searchParams.get('controls')).toBe('1');
  });

  it('can hide controls and hold autoplay', () => {
    const url = new URL(loopEmbedUrl('abc123', { controls: false, autoplay: false }));
    expect(url.searchParams.get('controls')).toBe('0');
    expect(url.searchParams.get('autoplay')).toBe('0');
  });
});

describe('youtubePoster', () => {
  it('points at the always-present medium thumbnail by default', () => {
    expect(youtubePoster('abc123')).toBe('https://i.ytimg.com/vi/abc123/mqdefault.jpg');
  });

  it('can ask for the HD thumbnail', () => {
    expect(youtubePoster('abc123', 'maxres')).toBe('https://i.ytimg.com/vi/abc123/maxresdefault.jpg');
  });
});
