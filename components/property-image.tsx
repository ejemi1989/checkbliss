"use client";

import { useState } from "react";

export function PropertyImage({
  src,
  alt,
  aspectClass = "aspect-[3/4]",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  aspectClass?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (!src || failed) {
    return (
      <div className={`${aspectClass} rounded-none overflow-hidden bg-ink flex items-center justify-center ${className}`}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} rounded-none overflow-hidden bg-ink ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
