/**
 * <SpriteSceneUpdater> — drives per-frame updates for one or more SpriteScenes.
 *
 * Place inside a <Book> component.  Each frame it calls `scene.update(dt, book)`
 * which ticks all sprite state machines, re-renders the canvas, and syncs
 * cloned material textures on the book's mesh hierarchy.
 *
 * Usage:
 *
 *   <Book ...>
 *     <BookInteraction ... />
 *     <SpriteSceneUpdater scenes={spriteScenes} />
 *   </Book>
 */

import { useFrame } from '@react-three/fiber';
import { useBook } from '@objectifthunes/react-three-book';
import type { SpriteScene } from './core/SpriteScene';

export interface SpriteSceneUpdaterProps {
  /** The SpriteScene instances to update every frame. */
  scenes: SpriteScene[];
}

/**
 * Renders nothing.  Calls `scene.update(dt, book)` for each scene every frame.
 */
export function SpriteSceneUpdater({ scenes }: SpriteSceneUpdaterProps) {
  const book = useBook();

  useFrame((_, delta) => {
    for (const scene of scenes) {
      scene.update(delta, book ?? undefined);
    }
  });

  return null;
}
