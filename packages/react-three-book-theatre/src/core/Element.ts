/**
 * A static placeable element — a single image drawn at depth-scaled size.
 */

import { renderedSize } from './perspective';
import { Positionable } from './Positionable';
import type { SpritePlacement } from './Positionable';

// SpritePlacement is already exported from index.ts via Positionable.ts

export interface ElementOptions {
  x?: number;
  y?: number;
  /** Placement band: 'ground' (default) or 'sky'. */
  placement?: SpritePlacement;
  /** Maximum scene distance in metres (default 10). */
  pageDistance?: number;
  /** Initial distance in metres (default pageDistance / 2). Ignored when y is set. */
  distance?: number;
  /** Intrinsic size in canvas pixels at d = 1 m (default 100). */
  intrinsicSize?: number;
  /** Enable depth-based size scaling. Default true. */
  depthScaling?: boolean;
  image?: HTMLImageElement | null;
}

export class Element extends Positionable {
  image: HTMLImageElement | null;

  constructor(
    canvasWidth:  number,
    canvasHeight: number,
    horizonY:     number,
    options?: ElementOptions,
  ) {
    super(
      canvasWidth, canvasHeight, horizonY,
      options?.placement     ?? 'ground',
      options?.intrinsicSize ?? 100,
      options?.pageDistance  ?? 10,
      options?.depthScaling  ?? true,
    );
    this.image = options?.image ?? null;
    this._placeItem(options ?? {});
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.image) return;
    const sz = this.depthScaling
      ? renderedSize(this.r, this.intrinsicSize, this.pageDistance)
      : this.intrinsicSize;
    // Top-pin: keep top visible, let bottom clip instead of top.
    ctx.drawImage(this.image, this.x - sz / 2, Math.max(0, this.y - sz), sz, sz);
  }
}
