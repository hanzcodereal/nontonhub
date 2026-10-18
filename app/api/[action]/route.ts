import { NextRequest, NextResponse } from 'next/server';
import { USER_AGENT } from '@/lib/bilibili';
import { getPlayStreams, getSubtitles } from '@/lib/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_HOSTS = [
  'bilivideo.com',
  'bilivideo.net',
  'akamaized.net',
  'hdslb.com',
  'bstarstatic.com',
  'bilibili.tv',
  'biliintl.com',
];

function safeUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return null;
    const ok = ALLOWED_HOSTS.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
    return ok ? u : null;
  } catch {
    return null;
  }
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function stamp(sec: number): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

async function streamAction(sp: URLSearchParams) {
  const epId = sp.get('ep_id') ?? undefined;
  const aid = sp.get('aid') ?? undefined;
  if (!epId && !aid) {
    return NextResponse.json({ error: 'ep_id atau aid wajib diisi' }, { status: 400 });
  }
  const [streams, subtitles] = await Promise.all([
    getPlayStreams({ ep_id: epId, aid }),
    getSubtitles({ ep_id: epId, aid }),
  ]);
  return NextResponse.json({ ...streams, subtitles }, { headers: { 'Cache-Control': 'no-store' } });
}

async function subAction(sp: URLSearchParams) {
  const target = safeUrl(sp.get('url'));
  if (!target) return new Response('URL tidak valid', { status: 400 });

  const res = await fetch(target, {
    headers: { 'User-Agent': USER_AGENT, Referer: 'https://www.bilibili.tv/' },
  });
  if (!res.ok) return new Response('Subtitle tidak ditemukan', { status: 502 });

  const json = (await res.json()) as { body?: { from: number; to: number; content: string }[] };
  const cues = (json.body ?? []).map(
    (c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${String(c.content).replace(/-->/g, '→')}\n`
  );

  return new Response(`WEBVTT\n\n${cues.join('\n')}`, {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}

async function proxyAction(req: NextRequest) {
  const target = safeUrl(req.nextUrl.searchParams.get('url'));
  if (!target) return new Response('URL tidak valid', { status: 400 });

  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Referer: 'https://www.bilibili.tv/',
    Origin: 'https://www.bilibili.tv',
  };
  const range = req.headers.get('range');
  if (range) headers.Range = range;

  const upstream = await fetch(target, { headers, cache: 'no-store' });

  const out = new Headers();
  for (const name of ['content-type', 'content-range', 'accept-ranges', 'last-modified', 'etag']) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  if (!upstream.headers.get('content-encoding')) {
    const length = upstream.headers.get('content-length');
    if (length) out.set('content-length', length);
  }
  out.set('Cache-Control', 'private, max-age=3600');

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export async function GET(req: NextRequest, ctx: { params: { action: string } }) {
  try {
    switch (ctx.params.action) {
      case 'stream':
        return await streamAction(req.nextUrl.searchParams);
      case 'sub':
        return await subAction(req.nextUrl.searchParams);
      case 'proxy':
        return await proxyAction(req);
      default:
        return NextResponse.json({ error: 'Endpoint tidak ditemukan' }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
      }
