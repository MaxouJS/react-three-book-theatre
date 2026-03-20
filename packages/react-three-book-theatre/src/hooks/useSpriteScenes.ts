/**
 * useSpriteScenes — creates an array of SpriteScene instances (one per page).
 *
 * The array length adjusts dynamically when `count` changes:
 *   - Existing scenes are preserved (no state reset)
 *   - New scenes are appended as needed
 *   - Excess scenes are disposed
 *
 * Options are reactive: dimension changes call `scene.resize()` on all
 * existing scenes, other property changes apply via live setters.
 */

import { useEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';

export function useSpriteScenes(
  count: number,
  options?: SpriteSceneOptions,
): SpriteScene[] {
  const ref = useRef<SpriteScene[]>([]);
  const prevCountRef = useRef(0);

  if (count !== prevCountRef.current) {
    const old = ref.current;
    const next: SpriteScene[] = [];

    for (let i = 0; i < count; i++) {
      next.push(i < old.length ? old[i] : new SpriteScene(options));
    }

    // Dispose removed scenes
    for (let i = count; i < old.length; i++) {
      old[i].dispose();
    }

    ref.current = next;
    prevCountRef.current = count;
  }

  // Apply reactive options (resize + live setters) to all existing scenes
  if (options) {
    const w = options.width  ?? 512;
    const h = options.height ?? 512;
    for (const scene of ref.current) {
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
  }

  useEffect(() => {
    return () => {
      for (const scene of ref.current) scene.dispose();
      ref.current = [];
    };
  }, []);

  return ref.current;
}
