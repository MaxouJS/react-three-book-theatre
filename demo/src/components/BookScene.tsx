import { useRef, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  Book,
  BookContent,
  BookInteraction,
  StapleBookBinding,
  useBookContent,
  createPageTexture,
  SpriteSceneUpdater,
  SpriteScene,
  SpriteSpreadScene,
} from '@objectifthunes/react-three-book-theatre';
import type { ThreeBook } from '@objectifthunes/react-three-book-theatre';
import { DIRECTION_TO_BOOK_DIRECTION, type DemoParams, type ImageSlot, type PageConfig } from '../state';

const COVER_LABELS = ['Front Cover Outer', 'Front Cover Inner', 'Back Cover Inner', 'Back Cover Outer'];

/** Expose scene internals for Playwright screenshot scripts. */
function DemoExposer({ orbitRef, bookRef }: { orbitRef: React.RefObject<any>; bookRef: React.MutableRefObject<ThreeBook | null> }) {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    (window as any).__demo = { scene, camera, renderer: gl, controls: orbitRef.current, bookRef };
  }, [scene, camera, gl, orbitRef, bookRef]);
  return null;
}

interface BookSceneProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageConfigs: PageConfig[];
  spreadPages: Set<number>;
  buildKey: number;
  bookRef: React.MutableRefObject<ThreeBook | null>;
  spriteScenes: React.MutableRefObject<SpriteScene[]>;
  onBuilt: (book: ThreeBook) => void;
  onError: (err: Error) => void;
}

export default function BookScene({
  params,
  coverSlots,
  pageConfigs,
  spreadPages,
  buildKey,
  bookRef,
  spriteScenes,
  onBuilt,
  onError,
}: BookSceneProps) {
  const orbitRef = useRef<any>(null);
  const spreadSceneMapRef = useRef<Map<number, SpriteSpreadScene>>(new Map());

  // Create/recreate SpriteScenes when buildKey changes
  const scenes = useMemo(() => {
    // Dispose old scenes
    const oldSpreadInstances = new Set<SpriteScene>();
    for (const sss of spreadSceneMapRef.current.values()) {
      oldSpreadInstances.add(sss.scene);
      sss.dispose();
    }
    spreadSceneMapRef.current = new Map();
    for (const s of spriteScenes.current) {
      if (!oldSpreadInstances.has(s)) s.dispose();
    }

    const PAGE_BASE = 512;
    const pageCanvasW = PAGE_BASE;
    const pageCanvasH = Math.round(PAGE_BASE * params.pageHeight / params.pageWidth);

    const newScenes: SpriteScene[] = [];
    const newSpreadMap = new Map<number, SpriteSpreadScene>();

    for (let i = 0; i < params.pageCount; i++) {
      // Right half of a spread — reuse left page's SpriteScene
      if (spreadPages.has(i - 1)) {
        newScenes.push(newSpreadMap.get(i - 1)!.scene);
        continue;
      }

      const cfg = pageConfigs[i];
      const isSpread = spreadPages.has(i);

      const sceneOpts = {
        height: pageCanvasH,
        background: params.pageColor,
        horizonFraction: cfg.horizonFraction,
        pageDistance: cfg.pageDistance,
        spriteCount: 0,
        backgroundImage: cfg.backgroundImage,
        backgroundImageFit: cfg.backgroundImageFit,
        animated: params.allAnimated,
        depthScaling: params.allDepthScaling,
      };

      let ss: SpriteScene;
      if (isSpread) {
        const sss = new SpriteSpreadScene({ ...sceneOpts, pageWidth: pageCanvasW });
        newSpreadMap.set(i, sss);
        ss = sss.scene;
      } else {
        ss = new SpriteScene({ ...sceneOpts, width: pageCanvasW });
      }

      // Add characters
      for (const ch of cfg.characters) {
        ss.addSprite({
          placement: ch.placement,
          distance: ch.distance,
          intrinsicSize: ch.intrinsicSize,
          animated: ch.animated,
          depthScaling: ch.depthScaling,
          patrolRadius: ch.patrolRadius,
          idleImage: ch.idleImage,
          walkImage: ch.walkImage,
          actionImage: ch.actionImage,
        });
      }

      // Add elements
      for (const el of cfg.elements) {
        ss.addElement({
          placement: el.placement,
          distance: el.distance,
          intrinsicSize: el.intrinsicSize,
          depthScaling: el.depthScaling,
          image: el.image,
        });
      }

      newScenes.push(ss);
    }

    spreadSceneMapRef.current = newSpreadMap;
    spriteScenes.current = newScenes;
    return newScenes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const sss of spreadSceneMapRef.current.values()) sss.dispose();
      spreadSceneMapRef.current = new Map();
      for (const s of spriteScenes.current) s.dispose();
      spriteScenes.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = useBookContent(() => {
    const c = new BookContent();
    c.direction = DIRECTION_TO_BOOK_DIRECTION[params.direction];
    c.covers.length = 0;
    for (let i = 0; i < 4; i++) {
      const s = coverSlots[i];
      c.covers.push(createPageTexture(params.coverColor, COVER_LABELS[i], s.useImage ? s.image : null, s.fitMode, s.fullBleed));
    }
    c.pages.length = 0;
    for (let i = 0; i < params.pageCount; i++) {
      const spreadLeft = spreadPages.has(i) ? spreadSceneMapRef.current.get(i) : null;
      const spreadRight = spreadPages.has(i - 1) ? spreadSceneMapRef.current.get(i - 1) : null;
      if (spreadLeft) {
        c.pages.push(spreadLeft.left);
      } else if (spreadRight) {
        c.pages.push(spreadRight.right);
      } else {
        c.pages.push(scenes[i].texture);
      }
    }
    return c;
  }, [scenes, params.direction, params.coverColor, coverSlots, params.pageCount, spreadPages]);

  const binding = useMemo(() => new StapleBookBinding(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <color attach="background" args={[0x1a1a2e]} />
      <ambientLight intensity={params.ambientIntensity} />
      <directionalLight intensity={params.sunIntensity} position={[params.sunX, params.sunY, params.sunZ]} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x2a2a4a} />
      </mesh>
      <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.05} target={[0, 0.5, 0]} />
      <DemoExposer orbitRef={orbitRef} bookRef={bookRef} />
      <Book
        key={buildKey} ref={bookRef} content={content} binding={binding}
        initialOpenProgress={params.openProgress} castShadows={params.castShadows}
        alignToGround={params.alignToGround} hideBinder={params.hideBinder}
        reduceShadows={params.reduceShadows} reduceSubMeshes={params.reduceSubMeshes} reduceOverdraw={params.reduceOverdraw}
        pagePaperSetup={{ width: params.pageWidth, height: params.pageHeight, thickness: params.pageThickness, stiffness: params.pageStiffness, color: new THREE.Color(1, 1, 1), material: null }}
        coverPaperSetup={{ width: params.coverWidth, height: params.coverHeight, thickness: params.coverThickness, stiffness: params.coverStiffness, color: new THREE.Color(1, 1, 1), material: null }}
        onBuilt={onBuilt} onError={onError}
      >
        <BookInteraction enabled={params.interactive} orbitControlsRef={orbitRef} />
        <SpriteSceneUpdater scenes={scenes} />
      </Book>
    </>
  );
}
