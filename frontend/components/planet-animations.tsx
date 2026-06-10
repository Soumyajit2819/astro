"use client";

/**
 * PlanetAnimations
 * ─────────────────
 * Fixed decorative layer. z-index: 0 — all content (z-index: 1) sits above.
 *
 * Layout of decorative elements:
 *
 *   TOP-LEFT corner    → Moon (drifting)
 *   TOP-RIGHT corner   → 5-ring orrery with Sun, Mercury, Venus, Mars, Jupiter beads
 *   RIGHT margin       → Big Jupiter (110px, behind hero empty space)
 *   BOTTOM-LEFT corner → Big Saturn with ring
 *   All 4 edges        → 18 twinkling stars
 *   Diagonal           → 2 shooting stars (timed, rare)
 *
 * Nothing is placed over the centre content columns.
 */
export function PlanetAnimations() {
  return (
    <div className="planet-scene" aria-hidden="true">

      {/* ── Orrery — top-right corner ── */}
      <div className="solar-system">
        <div className="orbit orbit-1"><div className="planet planet-sun" /></div>
        <div className="orbit orbit-2"><div className="planet planet-mercury" /></div>
        <div className="orbit orbit-3"><div className="planet planet-venus" /></div>
        <div className="orbit orbit-4"><div className="planet planet-mars" /></div>
        <div className="orbit orbit-5"><div className="planet planet-jupiter" /></div>
      </div>

      {/* ── Big Jupiter — right background, behind hero empty margin ── */}
      <div className="bg-jupiter" />

      {/* ── Big Saturn — bottom-left corner ── */}
      <div className="saturn-wrapper">
        <div className="saturn-body" />
        <div className="saturn-ring" />
      </div>

      {/* ── Moon — top-left corner ── */}
      <div className="moon-float">
        <div className="moon-body" />
      </div>

      {/* ── 18 edge-only twinkling stars ── */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`star star-${i + 1}`} />
      ))}

      {/* ── Shooting stars ── */}
      <div className="shooting-star" />
      <div className="shooting-star shooting-star-2" />

    </div>
  );
}
