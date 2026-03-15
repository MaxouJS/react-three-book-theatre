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

export type { ImageFit };

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
   * Purely cosmetic — does not affect the size formula.
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

  /** Replace at any time; will appear behind sprites on the next frame. */
  backgroundImage: HTMLImageElement | null;
  backgroundImageFit: ImageFit;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private _background: string;
  private _horizonY: number;
  private _pageDistance: number;
  private readonly _drawables: Positionable[] = [];

  get horizonFraction(): number { return this._horizonY / this.height; }

  /**
   * Update the horizon line.  All sprites and elements preserve their depth (r),
   * so their canvas positions are recomputed from the new horizonY.
   */
  set horizonFraction(v: number) {
    const newHorizonY = this.height * Math.max(0, Math.min(1, v));
    for (const s of this.sprites)  s.updateHorizonY(newHorizonY);
    for (const e of this.elements) e.updateHorizonY(newHorizonY);
    this._horizonY = newHorizonY;
  }

  get background(): string { return this._background; }
  set background(v: string) { this._background = v; }

  get pageDistance(): number { return this._pageDistance; }
  set pageDistance(v: number) {
    this._pageDistance = Math.max(0.1, v);
    for (const s of this.sprites)  s.pageDistance = this._pageDistance;
    for (const e of this.elements) e.pageDistance = this._pageDistance;
  }

  constructor(options?: SpriteSceneOptions) {
    const w = options?.width  ?? 512;
    const h = options?.height ?? 512;

    this.width              = w;
    this.height             = h;
    this._background        = options?.background       ?? '#e8d5b5';
    this._horizonY          = h * (options?.horizonFraction ?? 0.40);
    this._pageDistance      = Math.max(0.1, options?.pageDistance ?? 10);
    this.backgroundImage    = options?.backgroundImage    ?? null;
    this.backgroundImageFit = options?.backgroundImageFit ?? 'cover';

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

  // ── Public API ────────────────────────────────────────────────────────────

  addSprite(options?: SpriteOptions): Sprite {
    const s = new Sprite(this.width, this.height, this._horizonY, {
      ...options,
      pageDistance: this._pageDistance,
    });
    this.sprites.push(s);
    return s;
  }

  removeSprite(sprite: Sprite): void {
    const idx = this.sprites.indexOf(sprite);
    if (idx !== -1) this.sprites.splice(idx, 1);
  }

  addElement(options?: ElementOptions): Element {
    const e = new Element(this.width, this.height, this._horizonY, {
      ...options,
      pageDistance: this._pageDistance,
    });
    this.elements.push(e);
    return e;
  }

  removeElement(element: Element): void {
    const idx = this.elements.indexOf(element);
    if (idx !== -1) this.elements.splice(idx, 1);
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
    for (const s of this.sprites) s.update(dt);
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
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (hasMaterialMap(mat) && mat.map.image === this.canvas) {
          mat.map.needsUpdate = true;
        }
      }
    });
  }

  dispose(): void {
    this.texture.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _render(): void {
    const { ctx, width, height } = this;

    ctx.fillStyle = this._background;
    ctx.fillRect(0, 0, width, height);

    if (this.backgroundImage) {
      drawImageFit(ctx, this.backgroundImage, 0, 0, width, height, this.backgroundImageFit);
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
