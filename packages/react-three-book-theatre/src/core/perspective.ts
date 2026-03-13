/**
 * Depth-perspective helpers.
 *
 * ## Band fraction model
 *
 * r ∈ [0, 1] encodes depth:
 *   r = 0 : closest to viewer  (bottom of canvas for 'ground', ceiling for 'sky')
 *   r = 1 : at the horizon     (furthest visible point)
 *
 * Derived values:
 *   scene distance (m)   d  = r × pageDistance
 *   canvas y (ground)       = canvasH − (canvasH − horizonY) × r
 *   canvas y (sky)          = horizonY × r
 *   rendered size (px)   sz = intrinsicSize × 5 / max(1, d)
 */

/**
 * Ground band fraction from a canvas y coordinate.
 *   r = 0  at  y = canvasH   (closest to viewer)
 *   r = 1  at  y = horizonY  (horizon)
 */
export function groundR(y: number, horizonY: number, canvasH: number): number {
  if (canvasH <= horizonY) return 0;
  return Math.max(0, Math.min(1, (canvasH - y) / (canvasH - horizonY)));
}

/**
 * Sky band fraction from a canvas y coordinate.
 *   r = 0  at  y = 0         (closest to viewer / ceiling)
 *   r = 1  at  y = horizonY  (horizon)
 */
export function skyR(y: number, horizonY: number): number {
  if (horizonY <= 0) return 0;
  return Math.max(0, Math.min(1, y / horizonY));
}

/**
 * Movement speed scale given a band fraction r.
 *   Returns 1.0 near the viewer (r = 0) and 0.25 at the horizon (r = 1).
 */
export function depthScale(r: number): number {
  return 0.25 + 0.75 * (1 - Math.max(0, Math.min(1, r)));
}

/**
 * Rendered size in canvas pixels given band fraction r.
 *
 *   sz = intrinsicSize × 5 / max(1, d)   where d = r × pageDistance
 *
 * The factor 5 anchors the scale: intrinsicSize equals the rendered pixel
 * height when d = 5 m (the midpoint of the default 10 m scene).
 * intrinsicSize = 100 therefore produces a ~100 px character at default depth.
 */
export function renderedSize(r: number, intrinsicSize: number, pageDistance: number): number {
  const d = r * pageDistance;
  return intrinsicSize * 5 / Math.max(1, d);
}
