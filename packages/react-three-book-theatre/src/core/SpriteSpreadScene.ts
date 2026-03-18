/**
 * SpriteSpreadScene — double-page spread variant of SpriteScene.
 *
 * Creates a SpriteScene with a double-width canvas and exposes `left` and
 * `right` page-content halves.  Each half uses textureST to crop the shared
 * texture to its side of the spread — structurally compatible with three-book's
 * IPageContent interface.
 *
 * Usage:
 *   const spread = new SpriteSpreadScene({ pageWidth: 512, height: 768 });
 *   // Add sprites / elements via spread.scene
 *   bookContent.pages.push(spread.left);   // left page
 *   bookContent.pages.push(spread.right);  // right page
 *   // Per-frame:
 *   spread.update(dt, bookRoot);
 */

import * as THREE from 'three';
import { SpriteScene } from './SpriteScene';
import type { SpriteSceneOptions } from './SpriteScene';

// ── SpreadHalf — structurally compatible with three-book IPageContent ────────

export interface SpreadHalf {
  readonly texture: THREE.Texture;
  readonly textureST: THREE.Vector4;
  isPointOverUI(textureCoord: THREE.Vector2): boolean;
  init(bookContent: unknown): void;
  setActive(active: boolean): void;
}

class SpreadHalfContent implements SpreadHalf {
  private readonly _texture: THREE.Texture;
  private readonly _textureST: THREE.Vector4;

  constructor(texture: THREE.Texture, side: 'left' | 'right') {
    this._texture = texture;
    // Left half: show x=[0, 0.5], right half: show x=[0.5, 1]
    this._textureST = side === 'left'
      ? new THREE.Vector4(0.5, 1, 0, 0)
      : new THREE.Vector4(0.5, 1, 0.5, 0);
  }

  get texture(): THREE.Texture { return this._texture; }
  get textureST(): THREE.Vector4 { return this._textureST; }
  isPointOverUI(): boolean { return false; }
  init(): void {}
  setActive(): void {}
}

// ── Options ──────────────────────────────────────────────────────────────────

export type SpriteSpreadSceneOptions = Omit<SpriteSceneOptions, 'width'> & {
  /** Width of a single page in pixels.  The canvas will be 2× this.  Default 512. */
  pageWidth?: number;
};

// ── SpriteSpreadScene ────────────────────────────────────────────────────────

export class SpriteSpreadScene {
  /** The underlying double-width SpriteScene.  Add sprites / elements here. */
  readonly scene: SpriteScene;
  /** Left-half page content (textureST crops to x=[0, 0.5]). */
  readonly left: SpreadHalf;
  /** Right-half page content (textureST crops to x=[0.5, 1]). */
  readonly right: SpreadHalf;

  constructor(options?: SpriteSpreadSceneOptions) {
    const pw = options?.pageWidth ?? 512;
    this.scene = new SpriteScene({
      ...options,
      width: pw * 2,
    } as SpriteSceneOptions);
    this.left = new SpreadHalfContent(this.scene.texture, 'left');
    this.right = new SpreadHalfContent(this.scene.texture, 'right');
  }

  /**
   * Tick sprite animations and sync textures.
   * @param dt   Delta time in seconds.
   * @param root Optional THREE.Object3D to traverse for material sync.
   */
  update(dt: number, root?: THREE.Object3D): void {
    this.scene.update(dt, root);
  }

  dispose(): void {
    this.scene.dispose();
  }
}
