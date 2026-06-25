import { Play } from "lucide-react";
import type { PremiumVideo } from "@/lib/supabase-auth";

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/watch\?v=([^&#]+)/,
    /youtube\.com\/embed\/([^/?&#]+)/,
    /youtube\.com\/live\/([^/?&#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getThumbnail(video: PremiumVideo): string {
  if (video.thumbnail_url) return video.thumbnail_url;
  const ytId = getYouTubeId(video.video_url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return "";
}

function getEmbedUrl(url: string): string {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
  return url;
}

interface PremiumVideoCardProps {
  video: PremiumVideo;
}

export function PremiumVideoCard({ video }: PremiumVideoCardProps) {
  const thumb = getThumbnail(video);
  const embed = getEmbedUrl(video.video_url);

  return (
    <div className="group overflow-hidden rounded-[1.75rem] border border-sage/10 bg-white/80 shadow-glow transition hover:shadow-xl">
      {/* Thumbnail / embed */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/10">
        {thumb ? (
          <img src={thumb} alt={video.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sage/5">
            <Play className="h-12 w-12 text-sage/30" />
          </div>
        )}
        {/* Play overlay */}
        <a
          href={video.video_url}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-6 w-6 text-sage fill-sage" />
          </div>
        </a>
        {/* Category badge */}
        <span className="absolute left-3 top-3 rounded-full bg-sage/90 px-3 py-1 text-xs font-semibold text-ivory backdrop-blur">
          {video.category}
        </span>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-sage line-clamp-2">{video.title}</h3>
        {video.description && (
          <p className="mt-2 text-sm leading-5 text-sage/65 line-clamp-2">{video.description}</p>
        )}
        <a
          href={video.video_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2 text-xs font-semibold text-ivory transition hover:bg-sage/85"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Watch Now
        </a>
      </div>
    </div>
  );
}
