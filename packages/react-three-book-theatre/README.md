# @objectifthunes/react-three-book-theatre

[React Three Fiber](https://docs.pmnd.rs/react-three-fiber) integration for [three-book-theatre](https://www.npmjs.com/package/@objectifthunes/three-book-theatre) — add animated sprite scenes to book pages inside the `<Book>` component from [@objectifthunes/react-three-book](https://www.npmjs.com/package/@objectifthunes/react-three-book).

The theatre core (`SpriteScene`, `Sprite`, `Element`, perspective helpers) is embedded natively — no separate `three-book-theatre` dependency required.

<p align="center">
  <img src="https://raw.githubusercontent.com/AMusic-Max/react-three-book-theatre/main/docs/images/default.png" width="49%" alt="Closed book with sprite pages" />
  <img src="https://raw.githubusercontent.com/AMusic-Max/react-three-book-theatre/main/docs/images/open-half.png" width="49%" alt="Book opened showing sprites" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/AMusic-Max/react-three-book-theatre/main/docs/images/demo-ui.png" width="98%" alt="Demo app with theatre controls" />
</p>

## Features

- **`<SpriteSceneUpdater>`** — drop inside `<Book>` to drive `scene.update(dt, book)` every frame via `useFrame`.
- **`useSpriteScene` / `useSpriteScenes`** — hooks to create and auto-dispose sprite scenes.
- **Animated sprites** — autonomous 2D characters with idle/walk/action state machine.
- **Static elements** — place images (trees, props, furniture) at any depth.
- **Parallax depth** — band-fraction depth model with configurable horizon, ground/sky perspective.
- **Full react-three-book re-export** — single import for the entire book + theatre API.

## Installation

```bash
npm install @objectifthunes/react-three-book-theatre @objectifthunes/react-three-book three react @react-three/fiber
```

or

```bash
pnpm add @objectifthunes/react-three-book-theatre @objectifthunes/react-three-book three react @react-three/fiber
```

Peer dependencies: `three >= 0.150.0`, `react >= 18.0.0`, `@react-three/fiber >= 8.0.0`, `@objectifthunes/react-three-book >= 0.1.0`.

## Quick Start

```tsx
import { useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  Book,
  BookContent,
  BookInteraction,
  StapleBookBinding,
  SpriteScene,
  SpriteSceneUpdater,
  useBookContent,
} from '@objectifthunes/react-three-book-theatre';

function MyBook() {
  const scene = useMemo(() => new SpriteScene({
    width: 512, height: 512,
    background: '#e8d5b5',
    horizonFraction: 0.4,
    pageDistance: 10,
  }), []);

  useEffect(() => {
    scene.addSprite({
      placement: 'ground',
      distance: 5,
      intrinsicSize: 100,
      idleImage: myCharImg,
    });
    return () => scene.dispose();
  }, [scene]);

  const content = useBookContent(() => {
    const c = new BookContent();
    c.pages.push(scene.texture);
    return c;
  }, []);

  const binding = useMemo(() => new StapleBookBinding(), []);

  return (
    <Book content={content} binding={binding}>
      <BookInteraction />
      <SpriteSceneUpdater scenes={[scene]} />
    </Book>
  );
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} castShadow />
      <MyBook />
    </Canvas>
  );
}
```

## Components & Hooks

| Export | Type | Description |
|--------|------|-------------|
| `<SpriteSceneUpdater>` | Component | Place inside `<Book>` — calls `scene.update(dt, book)` every frame |
| `useSpriteScene(opts)` | Hook | Create a single `SpriteScene`, auto-dispose on unmount |
| `useSpriteScenes(optsArray)` | Hook | Create an array of `SpriteScene` instances, auto-dispose on unmount |

## Embedded Core

All core classes from three-book-theatre are re-exported:

| Category | Exports |
|----------|---------|
| Core | `SpriteScene`, `SpriteSceneOptions`, `SpriteUpdateOptions`, `ElementUpdateOptions` |
| Sprites | `Sprite`, `SpriteState`, `SpriteOptions` |
| Elements | `Element`, `ElementOptions` |
| Base | `Positionable`, `SpritePlacement` |
| Perspective | `groundR`, `skyR`, `depthScale`, `renderedSize` |
| Utilities | `drawImageFit`, `ImageFit` |

## Re-exported from react-three-book

The full react-three-book API is re-exported so consumers need only a single import:

| Category | Exports |
|----------|---------|
| Components | `Book`, `BookInteraction` |
| Context | `BookContext`, `useBook`, `useRequiredBook` |
| Hooks | `useBookRef`, `usePageTurning`, `useBookControls`, `useAutoTurn`, `useBookState`, `useBookContent` |
| Textures | `drawImageWithFit`, `createPageTexture`, `loadImage` |
| Core | `ThreeBook`, `BookContent`, `BookDirection`, `StapleBookBinding`, `Paper`, `PaperSetup`, and more |

## Development

From the workspace root:

```bash
pnpm install
pnpm build   # build the library
pnpm dev     # build library + start demo app
```
