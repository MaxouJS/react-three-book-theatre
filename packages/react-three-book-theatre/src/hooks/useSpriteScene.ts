/**
 * useSpriteScene — creates a SpriteScene, manages its lifecycle.
 *
 * Options are reactive: dimension changes call `scene.resize()`, other
 * property changes apply via live setters.  The same SpriteScene instance
 * is preserved across option changes — sprite state is never lost.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { SpriteScene } from '../core/SpriteScene';
import type { SpriteSceneOptions } from '../core/SpriteScene';
import { applySpriteSceneOptions } from './applySpriteSceneOptions';

export function useSpriteScene(options?: SpriteSceneOptions): SpriteScene {
  const ref = useRef<SpriteScene | null>(null);

  if (!ref.current) {
    ref.current = new SpriteScene(options);
  }

  // Apply options in useLayoutEffect instead of during render (concurrent-mode safe)
  useLayoutEffect(() => {
    if (ref.current) applySpriteSceneOptions(ref.current, options);
  });

  useEffect(() => {
    return () => {
      ref.current?.dispose();
      ref.current = null;
    };
  }, []);

  return ref.current;
}
