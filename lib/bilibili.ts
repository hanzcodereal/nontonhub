import vm from 'vm';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

export interface AnimeItem {
  title: string;
  season_id: string;
  cover: string;
  views: string;
  type: string;
  description: string;
  index_show: string;
}

export interface VideoItem {
  aid: string;
  title: string;
  cover: string;
  duration: string;
  views: string;
  author: string;
}

export interface SearchResult {
  query: string;
  anime: AnimeItem[];
  videos: VideoItem[];
}

export interface Episode {
  episode_id: string;
  title: string;
  short_title: string;
  cover: string;
  publish_time: string;
}

export interface AnimeDetail {
  type: 'anime';
  season_id: string;
  title: string;
  cover: string;
  description: string;
  views: string;
  styles: string[];
  episodes: Episode[];
}

export interface VideoDetail {
  type: 'video';
  aid: string;
  title: string;
  cover: string;
  description: string;
  duration: string;
  views: string;
  likes: string;
  author: string;
  authorAvatar: string;
}

export type Detail = AnimeDetail | VideoDetail;

const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

export function fixUrl(u: unknown): string {
  const s = str(u);
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('http://')) return `https://${s.slice(7)}`;
  return s;
}

function extractState(html: string): any {
  const startIdx = html.indexOf('window.__initialState');
  if (startIdx === -1) return null;
  const endIdx = html.indexOf('</script>', startIdx);
  if (endIdx === -1) return null;
  const code = html
    .substring(startIdx + 'window.__initialState='.length, endIdx)
    .trim()
    .replace(/;\s*$/, '');
  try {
    return vm.runInNewContext('(' + code + ')', {}, { timeout: 2000 });
  } catch {
    return null;
  }
}

async function fetchHtml(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, ...(referer ? { Referer: referer } : {}) },
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} saat mengambil data dari Bilibili`);
  return res.text();
}

export async function search(query: string): Promise<SearchResult> {
  if (!query) throw new Error('Kata kunci pencarian wajib diisi');
  const html = await fetchHtml(
    `https://www.bilibili.tv/en/search-result?q=${encodeURIComponent(query)}`,
    'https://www.bilibili.tv/'
  );
  const state = extractState(html);
  if (!state) throw new Error('Gagal membaca hasil pencarian');

  const anime: AnimeItem[] = [];
  const videos: VideoItem[] = [];

  const modules: any[] = state.searchAll?.allList || [];
  for (const mod of modules) {
    if (mod.type === 'ogv_subject' && Array.isArray(mod.items)) {
      for (const item of mod.items) {
        for (const s of item.seasons || []) {
          anime.push({
            title: str(s.title || item.title),
            season_id: str(s.season_id),
            cover: fixUrl(s.cover),
            views: str(s.view),
            type: str(s.season_type) || 'Anime',
            description: str(s.description),
            index_show: str(s.index_show),
          });
        }
      }
    } else if (mod.type === 'ugc' && Array.isArray(mod.items)) {
      for (const v of mod.items) {
        videos.push({
          aid: str(v.aid),
          title: str(v.title),
          cover: fixUrl(v.cover),
          duration: str(v.duration),
          views: str(v.view),
          author: str(v.author?.nickname),
        });
      }
    }
  }

  return { query, anime, videos };
}

export async function detail(target: string): Promise<Detail> {
  if (!target) throw new Error('URL atau ID wajib diisi');

  let isVideo = false;
  let seasonId = '';
  let aid = '';

  if (target.includes('/video/')) {
    isVideo = true;
    const m = target.match(/\/video\/(\d+)/);
    aid = m ? m[1] : target;
  } else if (target.includes('/play/')) {
    const m = target.match(/\/play\/(\d+)(?:\/(\d+))?/);
    seasonId = m ? m[1] : target;
  } else if (target.length > 8) {
    isVideo = true;
    aid = target;
  } else {
    seasonId = target;
  }

  if (isVideo) {
    const html = await fetchHtml(`https://www.bilibili.tv/en/video/${aid}`);
    const arc = extractState(html)?.ugc?.archive;
    if (!arc) throw new Error('Detail video tidak ditemukan');

    return {
      type: 'video',
      aid: str(arc.aid),
      title: str(arc.title),
      cover: fixUrl(arc.cover),
      description: str(arc.desc),
      duration: str(arc.duration),
      views: str(arc.stat?.views),
      likes: str(arc.stat?.like_count),
      author: str(arc.uploader?.name),
      authorAvatar: fixUrl(arc.uploader?.avatar),
    };
  }

  const html = await fetchHtml(`https://www.bilibili.tv/en/play/${seasonId}`);
  const state = extractState(html);
  const season = state?.ogv?.season;
  if (!season) throw new Error('Detail anime tidak ditemukan');

  const episodes: Episode[] = [];
  for (const sec of state?.ogv?.sectionsList || []) {
    for (const ep of sec.episodes || []) {
      episodes.push({
        episode_id: str(ep.episode_id),
        title: str(ep.title_display || ep.long_title_display),
        short_title: str(ep.short_title_display),
        cover: fixUrl(ep.cover),
        publish_time: str(ep.publish_time),
      });
    }
  }

  return {
    type: 'anime',
    season_id: str(season.season_id),
    title: str(season.title),
    cover: fixUrl(season.horizontal_cover || season.cover),
    description: str(season.description),
    views: str(season.view),
    styles: Array.isArray(season.styles) ? season.styles.map((s: any) => str(s.title || s)) : [],
    episodes,
  };
}
