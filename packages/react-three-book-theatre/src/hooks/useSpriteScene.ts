/**
 * useSpriteScene — creates a SpriteScene, manages its lifecycle.
 *
 * Options are reactive: dimension changes call `scene.resize()`, other
 * property changes apply via live setters.  The same SpriteScene instance
 * is preserved across option changes — sprite state is never lost.
 */

import { useEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';

function applySpriteSceneOptions(scene: SpriteScene, options?: SpriteSceneOptions): void {
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

export function useSpriteScene(options?: SpriteSceneOptions): SpriteScene {
  const ref = useRef<SpriteScene | null>(null);

  if (!ref.current) {
    ref.current = new SpriteScene(options);
  }

  applySpriteSceneOptions(ref.current, options);

  useEffect(() => {
    return () => {
      ref.current?.dispose();
      ref.current = null;
    };
  }, []);

  return ref.current;
}
