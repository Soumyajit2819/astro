"use client";

/**
 * PlanetAnimations
 * ----------------
 * A fixed, full-screen decorative layer rendered behind all content.
 * Uses pure CSS animations — zero JS timers, zero layout impact.
 * Respects prefers-reduced-motion automatically via the CSS media query
 * in globals.css.
 */
export function PlanetAnimations() {
  return (
    <div className="planet-scene" aria-hidden="true">
      {/* ── Orbit rings ──────────────────────────────────── */}
      <div className="orbit orbit-1">
        <div className="planet planet-sun" />
      </div>
      <div className="orbit orbit-2">
        <div className="planet planet-mercury" />
      </div>
      <div className="orbit orbit-3">
        <div className="planet planet-venus" />
      </div>
      <div className="orbit orbit-4">
        <div className="planet planet-mars" />
      </div>
      <div className="orbit orbit-5">
        <div className="planet planet-jupiter" />
      </div>

      {/* ── Saturn with ring ─────────────────────────────── */}
      <div className="saturn-wrapper">
        <div className="saturn-body" />
        <div className="saturn-ring" />
      </div>

      {/* ── Floating crescent moon ───────────────────────── */}
      <div className="moon-float">
        <div className="moon-body" />
      </div>

      {/* ── Twinkling stars ──────────────────────────────── */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`star star-${i + 1}`} />
      ))}

      {/* ── Shooting star ────────────────────────────────── */}
      <div className="shooting-star" />
      <div className="shooting-star shooting-star-2" />
    </div>
  );
}
