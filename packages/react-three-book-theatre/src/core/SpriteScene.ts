/**
 * SpriteScene — manages Sprite and Element objects on an off-screen canvas and
 * exposes a THREE.CanvasTexture for use as a book-page texture.
 *
 * ## three-book texture-update caveat
 *
 * three-book's Renderer clones every source texture when assigning it to a
 * material (so that repeat/offset don't bleed across papers).  After the first
 * render the clone's `needsUpdate` flag is consumed by the WebGL renderer and
 * reset to false.  three-book never re-sets it, so canvas changes are not
 * automatically picked up.
 *
 * **Fix**: pass the book's THREE.Object3D root to `update()`.  SpriteScene
 * traverses the hierarchy and sets `needsUpdate = true` on every material map
 * whose underlying image is this scene's canvas.  For advanced use cases
 * (e.g. custom sync strategies) call `syncMaterials(root)` directly.
 */

import * as THREE from 'three';
import { Sprite } from './Sprite';
import type { SpriteOptions } from './Sprite';
import { Element } from './Element';
import type { ElementOptions } from './Element';
import type { Positionable, SpritePlacement } from './Positionable';
import { drawImageFit } from './canvas-utils';
import type { ImageFit } from './canvas-utils';

// ImageFit is already exported from index.ts via canvas-utils.ts

// ── Public types ──────────────────────────────────────────────────────────────

export interface SpriteSceneOptions {
  /** Canvas width in pixels (default 512). */
  width?: number;
  /** Canvas height in pixels (default 512). */
  height?: number;
  /** CSS background colour (default '#e8d5b5'). */
  background?: string;
  /**
   * Fraction of canvas height where the horizon lies (default 0.40).
   * Affects rendered sprite size via horizonY → r → renderedSize().
   */
  horizonFraction?: number;
  /**
   * Scene depth in metres (default 10).
   * Appears directly in the size formula: sz = intrinsicSize × 5 / max(1, r × pageDistance).
   */
  pageDistance?: number;
  /** Number of sprites to create automatically (default 3). */
  spriteCount?: number;
  /** Optional image drawn behind the sprites. */
  backgroundImage?: HTMLImageElement | null;
  /** How the background image is fitted (default 'cover'). */
  backgroundImageFit?: ImageFit;
  /** Scene-wide animation override (default true).  When false, all sprites freeze. */
  animated?: boolean;
  /** Scene-wide depth-scaling override (default true).  When false, all items render at intrinsicSize. */
  depthScaling?: boolean;
}

/** Options for `SpriteScene.updateSprite()`. */
export interface SpriteUpdateOptions {
  color?:         string;
  distance?:      number;
  intrinsicSize?: number;
  placement?:     SpritePlacement;
  idleImage?:     HTMLImageElement | null;
  walkImage?:     HTMLImageElement | null;
  actionImage?:   HTMLImageElement | null;
  animated?:      boolean;
  depthScaling?:  boolean;
  patrolRadius?:  number;
}

/** Options for `SpriteScene.updateElement()`. */
export interface ElementUpdateOptions {
  distance?:      number;
  intrinsicSize?: number;
  placement?:     SpritePlacement;
  image?:         HTMLImageElement | null;
  depthScaling?:  boolean;
}

// ── Internal helper ───────────────────────────────────────────────────────────

type MappedMaterial = THREE.Material & { map: THREE.Texture };
function hasMaterialMap(mat: THREE.Material): mat is MappedMaterial {
  return (mat as { map?: unknown }).map instanceof THREE.Texture;
}

// ── SpriteScene class ─────────────────────────────────────────────────────────

export class SpriteScene {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  readonly sprites: Sprite[] = [];
  readonly elements: Element[] = [];

  private _backgroundImage: HTMLImageElement | null;
  private _backgroundImageFit: ImageFit;

  /** Replace at any time; will appear behind sprites on the next frame. */
  get backgroundImage(): HTMLImageElement | null { return this._backgroundImage; }
  set backgroundImage(v: HTMLImageElement | null) { this._backgroundImage = v; this._dirty = true; }
  get backgroundImageFit(): ImageFit { return this._backgroundImageFit; }
  set backgroundImageFit(v: ImageFit) { this._backgroundImageFit = v; this._dirty = true; }

  private readonly ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private _background: string;
  private _horizonY: number;
  private _pageDistance: number;
  private _animated: boolean;
  private _depthScaling: boolean;
  private readonly _drawables: Positionable[] = [];
  private _disposed = false;
  private _nextPaletteIdx = 0;
  private _dirty = true;
  private _sortedR: number[] = [];
  private readonly _singleMat: THREE.Material[] = [];

  get horizonFraction(): number { return this._horizonY / this.height; }

  /**
   * Update the horizon line.  All sprites and elements preserve their depth (r),
   * so their canvas positions are recomputed from the new horizonY.
   */
  set horizonFraction(v: number) {
    if (!Number.isFinite(v)) return;
    const newHorizonY = this.height * Math.max(0, Math.min(1, v));
    for (const s of this.sprites)  s.updateHorizonY(newHorizonY);
    for (const e of this.elements) e.updateHorizonY(newHorizonY);
    this._horizonY = newHorizonY;
    this._dirty = true;
  }

  get background(): string { return this._background; }
  set background(v: string) { this._background = v; this._dirty = true; }

  get pageDistance(): number { return this._pageDistance; }
  set pageDistance(v: number) {
    if (!Number.isFinite(v)) return;
    this._pageDistance = Math.max(0.1, v);
    for (const s of this.sprites)  s.pageDistance = this._pageDistance;
    for (const e of this.elements) e.pageDistance = this._pageDistance;
    this._dirty = true;
  }

  /** Scene-wide animation toggle.  When false, all sprites freeze. */
  get animated(): boolean { return this._animated; }
  set animated(v: boolean) {
    this._animated = v;
    for (const s of this.sprites) s.animated = v;
    this._dirty = true;
  }

  /** Scene-wide depth-scaling toggle.  When false, all items render at intrinsicSize. */
  get depthScaling(): boolean { return this._depthScaling; }
  set depthScaling(v: boolean) {
    this._depthScaling = v;
    for (const s of this.sprites)  s.depthScaling = v;
    for (const e of this.elements) e.depthScaling = v;
    this._dirty = true;
  }

  constructor(options?: SpriteSceneOptions) {
    const w = options?.width  ?? 512;
    const h = options?.height ?? 512;

    this.width              = w;
    this.height             = h;
    this._background        = options?.background       ?? '#e8d5b5';
    this._horizonY          = h * (options?.horizonFraction ?? 0.40);
    this._pageDistance      = Math.max(0.1, options?.pageDistance ?? 10);
    this._animated          = options?.animated            ?? true;
    this._depthScaling      = options?.depthScaling        ?? true;
    this._backgroundImage    = options?.backgroundImage    ?? null;
    this._backgroundImageFit = options?.backgroundImageFit ?? 'cover';

    this.canvas = document.createElement('canvas');
    this.canvas.width  = w;
    this.canvas.height = h;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('SpriteScene: could not get 2D context');
    this.ctx = ctx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const count = options?.spriteCount ?? 3;
    for (let i = 0; i < count; i++) this.addSprite();

    this._render();
  }

  /**
   * Resize the canvas.  All sprites and elements are scaled proportionally —
   * positions, origins, and walk targets adapt to the new coordinate space.
   * Animation state (idle/walk/action timers, facing direction) is preserved.
   * The same canvas element and CanvasTexture identity are kept, so existing
   * three-book material references remain valid.
   */
  resize(newWidth: number, newHeight: number): void {
    if (newWidth === this.width && newHeight === this.height) return;
    const fraction = this._horizonY / (this.height || 1);
    this.width  = newWidth;
    this.height = newHeight;
    this.canvas.width  = newWidth;
    this.canvas.height = newHeight;
    this._horizonY = newHeight * Math.max(0, Math.min(1, fraction));
    for (const s of this.sprites)  s._resize(newWidth, newHeight, this._horizonY);
    for (const e of this.elements) e._resize(newWidth, newHeight, this._horizonY);
    this._dirty = true;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  addSprite(options?: SpriteOptions): Sprite {
    const opts: SpriteOptions = {
      animated: this._animated,
      depthScaling: this._depthScaling,
      ...options,
      pageDistance: this._pageDistance,
    };
    if (opts.color === undefined) {
      opts._paletteIdx = this._nextPaletteIdx++;
    }
    const s = new Sprite(this.width, this.height, this._horizonY, opts);
    this.sprites.push(s);
    this._dirty = true;
    return s;
  }

  removeSprite(sprite: Sprite): void {
    const idx = this.sprites.indexOf(sprite);
    if (idx !== -1) { this.sprites.splice(idx, 1); this._dirty = true; }
  }

  addElement(options?: ElementOptions): Element {
    const e = new Element(this.width, this.height, this._horizonY, {
      depthScaling: this._depthScaling,
      ...options,
      pageDistance: this._pageDistance,
    });
    this.elements.push(e);
    this._dirty = true;
    return e;
  }

  removeElement(element: Element): void {
    const idx = this.elements.indexOf(element);
    if (idx !== -1) { this.elements.splice(idx, 1); this._dirty = true; }
  }

  /**
   * Update a sprite by index.  Only the provided fields are changed.
   * Placement changes preserve the current distance.
   */
  updateSprite(index: number, options: SpriteUpdateOptions): void {
    const s = this.sprites[index];
    if (!s) return;
    if (options.color         !== undefined) s.color         = options.color;
    if (options.intrinsicSize !== undefined) s.intrinsicSize = options.intrinsicSize;
    if (options.idleImage     !== undefined) s.idleImage     = options.idleImage;
    if (options.walkImage     !== undefined) s.walkImage     = options.walkImage;
    if (options.actionImage   !== undefined) s.actionImage   = options.actionImage;
    if (options.animated      !== undefined) s.animated      = options.animated;
    if (options.depthScaling  !== undefined) s.depthScaling  = options.depthScaling;
    if (options.patrolRadius  !== undefined) s.patrolRadius  = options.patrolRadius;
    if (options.placement !== undefined && options.placement !== s.placement) {
      const savedDistance = s.distance;
      s.placement = options.placement;
      s.distance  = savedDistance;
    }
    if (options.distance !== undefined) s.distance = options.distance;
  }

  /**
   * Update an element by index.  Only the provided fields are changed.
   * Placement changes preserve the current distance.
   */
  updateElement(index: number, options: ElementUpdateOptions): void {
    const e = this.elements[index];
    if (!e) return;
    if (options.intrinsicSize !== undefined) e.intrinsicSize = options.intrinsicSize;
    if (options.image         !== undefined) e.image         = options.image;
    if (options.depthScaling  !== undefined) e.depthScaling  = options.depthScaling;
    if (options.placement !== undefined && options.placement !== e.placement) {
      const savedDistance = e.distance;
      e.placement = options.placement;
      e.distance  = savedDistance;
    }
    if (options.distance !== undefined) e.distance = options.distance;
  }

  /**
   * Call every frame.
   *
   * @param dt   Delta time in seconds.
   * @param root THREE.Object3D root (e.g. the Book) to traverse for texture
   *             sync.  Required to propagate canvas updates through three-book's
   *             cloned material textures — see module comment above.
   */
  update(dt: number, root?: THREE.Object3D): void {
    if (this._disposed) return;
    // Sprites always animate, so mark dirty whenever any are animated
    let anyAnimated = false;
    for (const s of this.sprites) {
      if (s.animated) anyAnimated = true;
      s.update(dt);
    }
    if (anyAnimated) this._dirty = true;
    if (!this._dirty) return;
    this._dirty = false;
    this._render();
    this.texture.needsUpdate = true;
    if (root) this.syncMaterials(root);
  }

  /**
   * Traverse `root` and set `needsUpdate = true` on every material map whose
   * source image is this scene's canvas.
   *
   * Called automatically by `update()` when `root` is provided.  Expose for
   * advanced use cases where consumers need manual sync control.
   */
  syncMaterials(root: THREE.Object3D): void {
    root.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        for (const mat of mesh.material) {
          if (hasMaterialMap(mat) && mat.map.image === this.canvas) {
            mat.map.needsUpdate = true;
          }
        }
      } else {
        const mat = mesh.material;
        if (hasMaterialMap(mat) && mat.map.image === this.canvas) {
          mat.map.needsUpdate = true;
        }
      }
    });
  }

  dispose(): void {
    this.texture.dispose();
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.sprites.length = 0;
    this.elements.length = 0;
    this._drawables.length = 0;
    this._disposed = true;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _render(): void {
    const { ctx, width, height } = this;

    ctx.fillStyle = this._background;
    ctx.fillRect(0, 0, width, height);

    if (this._backgroundImage) {
      drawImageFit(ctx, this._backgroundImage, 0, 0, width, height, this._backgroundImageFit);
    }

    // Subtle horizon line
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this._horizonY);
    ctx.lineTo(width, this._horizonY);
    ctx.stroke();

    // Build drawables list (reuse array to avoid per-frame allocation)
    this._drawables.length = 0;
    for (const s of this.sprites)  this._drawables.push(s);
    for (const e of this.elements) this._drawables.push(e);

    // Draw back-to-front: higher r = further = drawn first
    this._drawables.sort((a, b) => b.r - a.r);
    for (const d of this._drawables) d.draw(ctx);
  }
}
