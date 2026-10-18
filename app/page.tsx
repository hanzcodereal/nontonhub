import Link from 'next/link';
import { search, type SearchResult } from '@/lib/bilibili';

export const dynamic = 'force-dynamic';

const QUICK = ['One Piece', 'Naruto', 'Jujutsu Kaisen', 'Demon Slayer', 'Spy x Family', 'Frieren'];

interface CoverProps {
  href: string;
  title: string;
  cover: string;
  lines: string[];
  size?: 'big' | 'wide' | '';
}

function Cover({ href, title, cover, lines, size = '' }: CoverProps) {
  return (
    <Link href={href} className={`tile cover ${size}`}>
      {cover ? <img src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
      <div className="cover-info">
        <strong>{title}</strong>
        {lines.filter(Boolean).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </Link>
  );
}

export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();

  let data: SearchResult | null = null;
  let error = '';
  try {
    data = await search(q || 'anime');
  } catch (e) {
    error = e instanceof Error ? e.message : 'Gagal memuat data';
  }

  return (
    <main>
      {!q && (
        <section className="bento" aria-label="Selamat datang">
          <div className="tile big t-ink hero">
            <h1>Nonton anime favoritmu, langsung putar.</h1>
            <p>Cari judul, pilih episode, lalu tonton. Tanpa daftar akun.</p>
          </div>
          <div className="tile wide t-coral">
            <h2>Coba cari</h2>
            <div className="chips">
              {QUICK.map((c) => (
                <Link key={c} href={`/?q=${encodeURIComponent(c)}`} className="chip">
                  {c}
                </Link>
              ))}
            </div>
          </div>
          <div className="tile t-mint">
            <h2>Pilih kualitas</h2>
            <p>Ganti resolusi kapan saja saat menonton.</p>
          </div>
          <div className="tile t-lemon">
            <h2>Subtitle</h2>
            <p>Ikut tampil di judul yang menyediakannya.</p>
          </div>
        </section>
      )}

      {error && (
        <section className="bento" aria-live="polite">
          <div className="tile wide t-coral">
            <h2>Data belum bisa dimuat</h2>
            <p>{error}. Coba muat ulang halaman beberapa saat lagi.</p>
          </div>
        </section>
      )}

      {data && (
        <>
          {!q && <h2 className="sec">Rekomendasi anime</h2>}
          <section className="bento" aria-label="Anime">
            {q && (
              <div className="tile wide t-ink">
                <h1>Hasil untuk “{q}”</h1>
                <p className="meta">
                  {data.anime.length} anime dan {data.videos.length} video ditemukan
                </p>
              </div>
            )}
            {data.anime.length === 0 && q && (
              <div className="tile wide t-lemon">
                <h2>Anime tidak ditemukan</h2>
                <p>Coba kata kunci lain atau ejaan yang berbeda.</p>
              </div>
            )}
            {data.anime.map((a, i) => (
              <Cover
                key={a.season_id}
                href={`/watch/${a.season_id}`}
                title={a.title}
                cover={a.cover}
                lines={[a.index_show, a.views ? `${a.views} tayangan` : '']}
                size={i % 7 === 0 ? 'big' : ''}
              />
            ))}
          </section>

          {data.videos.length > 0 && (
            <>
              <h2 className="sec">Video</h2>
              <section className="bento" aria-label="Video">
                {data.videos.map((v, i) => (
                  <Cover
                    key={v.aid}
                    href={`/watch/${v.aid}?t=v`}
                    title={v.title}
                    cover={v.cover}
                    lines={[v.author, v.duration]}
                    size={i % 5 === 0 ? 'wide' : ''}
                  />
                ))}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
        }
