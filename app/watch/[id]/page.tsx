import Link from 'next/link';
import { detail, type Detail } from '@/lib/bilibili';
import Player from '@/components/Player';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
  searchParams: { ep?: string; t?: string };
}

export default async function Watch({ params, searchParams }: Props) {
  const isVideo = searchParams.t === 'v';

  let info: Detail;
  try {
    info = await detail(
      isVideo
        ? `https://www.bilibili.tv/en/video/${params.id}`
        : `https://www.bilibili.tv/en/play/${params.id}`
    );
  } catch (e) {
    return (
      <main className="bento">
        <div className="tile wide t-coral">
          <h1>Gagal memuat</h1>
          <p>{e instanceof Error ? e.message : 'Terjadi kesalahan'}</p>
          <Link href="/" className="back">
            Kembali ke beranda
          </Link>
        </div>
      </main>
    );
  }

  if (info.type === 'video') {
    return (
      <main className="bento watch">
        <div className="tile t-player">
          <Player key={info.aid} aid={info.aid} title={info.title} />
        </div>
        <div className="tile t-info t-ink">
          <h1 style={{ fontSize: '1.6rem' }}>{info.title}</h1>
          <p className="meta">{info.author}</p>
          <p className="meta">
            {[info.views && `${info.views} tayangan`, info.likes && `${info.likes} suka`].filter(Boolean).join(', ')}
          </p>
        </div>
        <div className="tile t-desc t-mint">
          <h2>Deskripsi</h2>
          <p className="desc">{info.description || 'Belum ada deskripsi.'}</p>
        </div>
      </main>
    );
  }

  const current = info.episodes.find((e) => e.episode_id === searchParams.ep) ?? info.episodes[0];

  return (
    <main className="bento watch">
      <div className="tile t-player">
        {current ? (
          <Player key={current.episode_id} epId={current.episode_id} title={info.title} />
        ) : (
          <div className="player-state">
            <p>Belum ada episode yang bisa diputar.</p>
          </div>
        )}
      </div>
      <div className="tile t-info t-ink">
        <h1 style={{ fontSize: '1.6rem' }}>{info.title}</h1>
        {current && <p className="meta">{current.title || current.short_title}</p>}
        {info.views && <p className="meta">{info.views} tayangan</p>}
        {info.styles.length > 0 && (
          <div className="chips">
            {info.styles.map((s) => (
              <span key={s} className="chip">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="tile t-desc t-mint">
        <h2>Sinopsis</h2>
        <p className="desc">{info.description || 'Belum ada sinopsis.'}</p>
      </div>
      <div className="tile t-eps t-lemon">
        <h2>{info.episodes.length} episode</h2>
        <nav className="eps" aria-label="Daftar episode">
          {info.episodes.map((ep, i) => (
            <Link
              key={ep.episode_id}
              href={`/watch/${params.id}?ep=${ep.episode_id}`}
              className="ep"
              aria-current={current?.episode_id === ep.episode_id ? 'page' : undefined}
              title={ep.title}
            >
              {ep.short_title || i + 1}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
