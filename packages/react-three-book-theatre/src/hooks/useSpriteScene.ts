/**
 * useSpriteScene — creates a SpriteScene, manages its lifecycle.
 *
 * Returns the SpriteScene instance.  Disposes automatically on unmount.
 */

import { useEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';

export function useSpriteScene(options?: SpriteSceneOptions): SpriteScene {
  const ref = useRef<SpriteScene | null>(null);

  if (!ref.current) {
    ref.current = new SpriteScene(options);
  }

  useEffect(() => {
    return () => {
      ref.current?.dispose();
      ref.current = null;
    };
  }, []);

  return ref.current;
}
