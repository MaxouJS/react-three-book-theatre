import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';

/**
 * Apply reactive SpriteSceneOptions to an existing SpriteScene.
 *
 * Dimension changes trigger `scene.resize()`; other property changes
 * are applied via the scene's live setters.
 */
export function applySpriteSceneOptions(scene: SpriteScene, options?: SpriteSceneOptions): void {
  if (!options) return;
  const w = options.width  ?? 512;
  const h = options.height ?? 512;
  if (w !== scene.canvas.width || h !== scene.canvas.height) {
    scene.resize(w, h);
  }
  if (options.background       !== undefined) scene.background       = options.background;
  if (options.horizonFraction   !== undefined) scene.horizonFraction   = options.horizonFraction;
  if (options.pageDistance      !== undefined) scene.pageDistance      = options.pageDistance;
  if (options.animated          !== undefined) scene.animated          = options.animated;
  if (options.depthScaling      !== undefined) scene.depthScaling      = options.depthScaling;
  if (options.backgroundImage   !== undefined) scene.backgroundImage   = options.backgroundImage;
  if (options.backgroundImageFit !== undefined) scene.backgroundImageFit = options.backgroundImageFit;
}
