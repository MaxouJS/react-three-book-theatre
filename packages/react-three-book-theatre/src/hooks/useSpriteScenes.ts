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

import { useEffect, useLayoutEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';
import { applySpriteSceneOptions } from './applySpriteSceneOptions';

export function useSpriteScenes(
  count: number,
  options?: SpriteSceneOptions,
): SpriteScene[] {
  const ref = useRef<SpriteScene[]>([]);
  const desiredCountRef = useRef(0);
  desiredCountRef.current = count;

  // Defer scene creation/disposal to useLayoutEffect (concurrent-mode safe)
  useLayoutEffect(() => {
    const old = ref.current;
    if (count === old.length) return;

    const next: SpriteScene[] = [];
    for (let i = 0; i < count; i++) {
      next.push(i < old.length ? old[i] : new SpriteScene(options));
    }
    // Dispose removed scenes
    for (let i = count; i < old.length; i++) {
      old[i].dispose();
    }
    ref.current = next;
  }, [count]);

  // Apply reactive options in useLayoutEffect instead of during render
  useLayoutEffect(() => {
    for (const scene of ref.current) {
      applySpriteSceneOptions(scene, options);
    }
  });

  useEffect(() => {
    return () => {
      for (const scene of ref.current) scene.dispose();
      ref.current = [];
    };
  }, []);

  return ref.current;
}
