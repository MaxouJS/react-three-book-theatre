/**
 * Abstract base class for depth-positioned canvas objects (Sprite, Element).
 *
 * Encapsulates the band-fraction depth model:
 *   r ∈ [0, 1] — 0 = closest to viewer, 1 = at horizon
 *   d = r × pageDistance (metres)
 *
 * - 'ground' band: r=0 at canvasHeight (bottom), r=1 at horizonY
 * - 'sky'    band: r=0 at y=0 (ceiling),         r=1 at horizonY
 */

import { groundR, skyR } from './perspective';

export type SpritePlacement = 'ground' | 'sky';

export abstract class Positionable {
  x: number = 0;
  y: number = 0;
  placement:     SpritePlacement;
  intrinsicSize: number;
  pageDistance:  number;
  horizonY:      number;
  /** When false, rendered size equals intrinsicSize regardless of depth (default true). */
  depthScaling:  boolean;

  protected canvasW: number;
  protected canvasH: number;

  constructor(
    canvasWidth:   number,
    canvasHeight:  number,
    horizonY:      number,
    placement:     SpritePlacement = 'ground',
    intrinsicSize: number          = 100,
    pageDistance:  number          = 10,
    depthScaling:  boolean         = true,
  ) {
    this.canvasW       = canvasWidth;
    this.canvasH       = canvasHeight;
    this.horizonY      = horizonY;
    this.placement     = placement;
    this.intrinsicSize = intrinsicSize;
    this.pageDistance  = pageDistance;
    this.depthScaling  = depthScaling;
  }

  /** Band fraction r: 0 = at viewer, 1 = at horizon. */
  get r(): number {
    return this.placement === 'ground'
      ? groundR(this.y, this.horizonY, this.canvasH)
      : skyR(this.y, this.horizonY);
  }

  protected _yFromR(r: number): number {
    return this.placement === 'ground'
      ? this.canvasH - (this.canvasH - this.horizonY) * r
      : this.horizonY * r;
  }

  get distance(): number { return this.r * this.pageDistance; }

  set distance(d: number) {
    this.y = this._yFromR(Math.max(0, Math.min(1, d / Math.max(0.001, this.pageDistance))));
  }

  /** Called by SpriteScene when horizonFraction changes. Preserves depth (r). */
  updateHorizonY(newHorizonY: number): void {
    const savedR  = this.r;
    this.horizonY = newHorizonY;
    this.y        = this._yFromR(savedR);
  }

  /**
   * Initialise x/y from options.  Call from subclass constructor after super().
   * If y is given it is used directly; otherwise distance (or pageDistance/2) is used.
   */
  protected _placeItem(options: { x?: number; y?: number; distance?: number }): void {
    if (options.y !== undefined) {
      this.y = options.y;
    } else {
      this.distance = options.distance ?? this.pageDistance * 0.5;
    }
    const margin = this.canvasW * 0.1;
    this.x = options.x ?? margin + Math.random() * (this.canvasW - margin * 2);
  }

  /**
   * Resize: scale x proportionally, preserve depth (r) in new coordinate space.
   * Subclasses override to also scale origin, walk targets, etc.
   */
  _resize(newW: number, newH: number, newHorizonY: number): void {
    const savedR = this.r;
    const xFrac  = this.canvasW > 0 ? this.x / this.canvasW : 0.5;
    this.canvasW  = newW;
    this.canvasH  = newH;
    this.horizonY = newHorizonY;
    this.x = xFrac * newW;
    this.y = this._yFromR(savedR);
  }

  abstract draw(ctx: CanvasRenderingContext2D): void;
}
