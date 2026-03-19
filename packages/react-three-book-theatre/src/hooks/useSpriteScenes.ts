/**
 * useSpriteScenes — creates an array of SpriteScene instances (one per page).
 *
 * The array length adjusts dynamically when `count` changes:
 *   - Existing scenes are preserved (no state reset)
 *   - New scenes are appended as needed
 *   - Excess scenes are disposed
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

  useEffect(() => {
    return () => {
      for (const scene of ref.current) scene.dispose();
      ref.current = [];
    };
  }, []);

  return ref.current;
}
