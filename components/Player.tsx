'use client';

import { useEffect, useRef, useState } from 'react';
import type { StreamPayload } from '@/lib/stream';

interface Props {
  epId?: string;
  aid?: string;
  title: string;
}

const proxy = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;

export default function Player({ epId, aid, title }: Props) {
  const [data, setData] = useState<StreamPayload | null>(null);
  const [failed, setFailed] = useState('');
  const [qi, setQi] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const resume = useRef({ time: 0, play: false });

  useEffect(() => {
    const ctrl = new AbortController();
    const query = epId ? `ep_id=${epId}` : `aid=${aid}`;
    fetch(`/api/stream?${query}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: StreamPayload) => {
        if (!j.videos?.length) {
          setFailed(j.error ?? 'Stream tidak tersedia untuk judul ini');
          return;
        }
        const avc = j.videos.filter((v) => v.codecs.startsWith('avc'));
        const list = avc.length ? avc : j.videos;
        const start = list.findIndex((v) => v.quality <= 80);
        setQi(start === -1 ? 0 : start);
        setData(j);
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setFailed('Gagal memuat stream. Coba muat ulang halaman.');
      });
    return () => ctrl.abort();
  }, [epId, aid]);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;

    const sync = () => {
      if (Math.abs(a.currentTime - v.currentTime) > 0.3) a.currentTime = v.currentTime;
    };
    const onPlay = () => {
      sync();
      void a.play().catch(() => undefined);
    };
    const onPause = () => a.pause();
    const onSeek = () => {
      a.currentTime = v.currentTime;
    };
    const onRate = () => {
      a.playbackRate = v.playbackRate;
    };
    const onVolume = () => {
      a.volume = v.volume;
      a.muted = v.muted;
    };
    const onTime = () => {
      if (!v.paused) sync();
    };

    v.addEventListener('play', onPlay);
    v.addEventListener('playing', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('waiting', onPause);
    v.addEventListener('seeked', onSeek);
    v.addEventListener('ratechange', onRate);
    v.addEventListener('volumechange', onVolume);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('playing', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('waiting', onPause);
      v.removeEventListener('seeked', onSeek);
      v.removeEventListener('ratechange', onRate);
      v.removeEventListener('volumechange', onVolume);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [data]);

  if (failed) {
    return (
      <div className="player-state" role="alert">
        <p>{failed}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="player-state" aria-live="polite">
        <p>
          <span className="spin" />
          Memuat stream
        </p>
      </div>
    );
  }

  const avc = data.videos.filter((v) => v.codecs.startsWith('avc'));
  const list = avc.length ? avc : data.videos;
  const current = list[Math.min(qi, list.length - 1)];
  const audio = data.audios[0];

  const changeQuality = (i: number) => {
    const v = videoRef.current;
    if (v) resume.current = { time: v.currentTime, play: !v.paused };
    setQi(i);
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v || resume.current.time <= 0) return;
    v.currentTime = resume.current.time;
    if (resume.current.play) void v.play().catch(() => undefined);
    resume.current = { time: 0, play: false };
  };

  return (
    <div className="player">
      <video
        ref={videoRef}
        src={proxy(current.url)}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        onLoadedMetadata={onLoadedMetadata}
      >
        {data.subtitles.map((s, i) => (
          <track
            key={s.url}
            kind="subtitles"
            src={`/api/sub?url=${encodeURIComponent(s.url)}`}
            srcLang={s.lang_key || 'en'}
            label={s.lang || s.lang_key || 'Subtitle'}
            default={i === 0}
          />
        ))}
      </video>
      {audio && <audio ref={audioRef} src={proxy(audio.url)} preload="auto" />}
      <div className="qualities">
        <span>Kualitas</span>
        {list.map((v, i) => (
          <button
            key={`${v.quality}-${v.codecs}`}
            type="button"
            className="q"
            aria-pressed={v === current}
            onClick={() => changeQuality(i)}
          >
            {v.resolution}
          </button>
        ))}
      </div>
    </div>
  );
    }
