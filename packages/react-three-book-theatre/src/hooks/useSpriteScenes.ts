/**
 * useSpriteScenes — creates an array of SpriteScene instances (one per page).
 *
 * The array length is fixed at creation time.  If you need to change it,
 * remount with a different `key`.
 */

import { useEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';

export function useSpriteScenes(
  count: number,
  options?: SpriteSceneOptions,
): SpriteScene[] {
  const ref = useRef<SpriteScene[] | null>(null);

  if (!ref.current) {
    ref.current = Array.from({ length: count }, () => new SpriteScene(options));
  }

  useEffect(() => {
    return () => {
      if (ref.current) {
        for (const scene of ref.current) scene.dispose();
        ref.current = null;
      }
    };
  }, []);

  return ref.current;
}
