"use client";

/**
 * PlanetAnimations
 * ----------------
 * Fixed decorative layer — sits BEHIND all content (z-index: 0).
 * All content (cards, text, nav) uses z-index: 1 via globals.css.
 * Planets are confined to viewport edges so no text is ever obscured.
 */
export function PlanetAnimations() {
  return (
    <div className="planet-scene" aria-hidden="true">

      {/* ── Solar system anchored to top-right corner ── */}
      <div className="solar-system">
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
      </div>

      {/* ── Saturn — bottom-left corner ── */}
      <div className="saturn-wrapper">
        <div className="saturn-body" />
        <div className="saturn-ring" />
      </div>

      {/* ── Moon — top-left corner ── */}
      <div className="moon-float">
        <div className="moon-body" />
      </div>

      {/* ── 18 edge-positioned twinkling stars ── */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`star star-${i + 1}`} />
      ))}

      {/* ── Shooting stars ── */}
      <div className="shooting-star" />
      <div className="shooting-star shooting-star-2" />

    </div>
  );
}
