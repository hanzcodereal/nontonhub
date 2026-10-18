import { USER_AGENT } from './bilibili';

export interface VideoStream {
  quality: number;
  resolution: string;
  codecs: string;
  bandwidth: number;
  size: number;
  url: string;
}

export interface AudioStream {
  quality: number;
  codecs: string;
  size: number;
  url: string;
}

export interface Subtitle {
  lang: string;
  lang_key: string;
  url: string;
}

export interface StreamResult {
  videos: VideoStream[];
  audios: AudioStream[];
  error?: string;
}

export interface StreamPayload extends StreamResult {
  subtitles: Subtitle[];
}

interface StreamTarget {
  ep_id?: string;
  aid?: string;
}

export async function getPlayStreams({ ep_id, aid }: StreamTarget): Promise<StreamResult> {
  const params = new URLSearchParams({ platform: 'web' });
  if (ep_id) params.set('ep_id', ep_id);
  if (aid) params.set('aid', aid);

  const res = await fetch(`https://api.bilibili.tv/intl/gateway/web/playurl?${params.toString()}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Referer: ep_id ? `https://www.bilibili.tv/en/play/${ep_id}` : `https://www.bilibili.tv/en/video/${aid}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) return { videos: [], audios: [], error: `HTTP ${res.status} saat mengambil stream` };
  const json = await res.json();
  if (json.code !== 0 || !json.data?.playurl) {
    return { videos: [], audios: [], error: json.message || 'Stream tidak tersedia' };
  }

  const rawVideos: any[] = json.data.playurl.video || [];
  const rawAudios: any[] = json.data.playurl.audio_resource || [];

  const videos: VideoStream[] = [];
  const seen = new Set<string>();
  for (const v of rawVideos) {
    const r = v.video_resource || {};
    const info = v.stream_info || {};
    if (!r.url) continue;
    const key = `${r.quality}_${r.codecs}`;
    if (seen.has(key)) continue;
    seen.add(key);
    videos.push({
      quality: Number(r.quality) || 0,
      resolution: info.desc_words || `${r.width}x${r.height}`,
      codecs: r.codecs || '',
      bandwidth: r.bandwidth || 0,
      size: r.size || 0,
      url: r.url,
    });
  }

  const audios: AudioStream[] = [];
  for (const a of rawAudios) {
    if (!a.url) continue;
    audios.push({
      quality: a.bandwidth || 0,
      codecs: a.codecs || '',
      size: a.size || 0,
      url: a.url,
    });
  }

  videos.sort((a, b) => b.quality - a.quality);
  audios.sort((a, b) => b.quality - a.quality);

  return { videos, audios };
}

export async function getSubtitles({ ep_id, aid }: StreamTarget): Promise<Subtitle[]> {
  const params = new URLSearchParams({ platform: 'web', s_locale: 'en_US' });
  if (ep_id) params.set('episode_id', ep_id);
  if (aid) params.set('aid', aid);

  try {
    const res = await fetch(`https://api.bilibili.tv/intl/gateway/web/v2/subtitle?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.bilibili.tv/' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list: any[] = json.data?.subtitles || [];
    return list
      .filter((s) => s.url)
      .map((s) => ({ lang: s.lang || '', lang_key: s.lang_key || '', url: s.url }));
  } catch {
    return [];
  }
  }
