import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeBook } from '@objectifthunes/react-three-book-theatre';
import type { SpriteScene } from '@objectifthunes/react-three-book-theatre';
import {
  defaultParams,
  EMPTY_SLOT,
  createDefaultPageConfig,
  type DemoParams,
  type ImageSlot,
  type PageConfig,
} from './state';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import PageEditor from './components/PageEditor';

const MAX_PAGES = 40;

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [buildKey, setBuildKey] = useState(0);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() =>
    Array.from({ length: 4 }, () => ({ ...EMPTY_SLOT })),
  );
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>(() =>
    Array.from({ length: MAX_PAGES }, () => createDefaultPageConfig()),
  );
  const [spreadPages, setSpreadPages] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState('Building...');
  const [editorPage, setEditorPage] = useState(0);
  const bookRef = useRef<ThreeBook | null>(null);
  const spriteScenes = useRef<SpriteScene[]>([]);

  const rebuild = useCallback(() => setBuildKey((k) => k + 1), []);

  const setParam = useCallback(<K extends keyof DemoParams>(key: K, value: DemoParams[K], doRebuild = true) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (doRebuild) setBuildKey((k) => k + 1);
  }, []);

  const setPageCount = useCallback((count: number) => {
    setParams((prev) => ({ ...prev, pageCount: count }));
    // Ensure we have enough page configs
    setPageConfigs((prev) => {
      if (prev.length >= count) return prev;
      return [...prev, ...Array.from({ length: count - prev.length }, () => createDefaultPageConfig())];
    });
    setBuildKey((k) => k + 1);
  }, []);

  const onBuilt = useCallback((book: ThreeBook) => {
    bookRef.current = book;
    setStatus(`Book built: ${book.paperCount} papers, ${params.pageCount} sprite scenes`);
  }, [params.pageCount]);

  const onError = useCallback((err: Error) => setStatus(`Error: ${err.message}`), []);

  const onCoverSlotChange = useCallback((i: number, updater: (s: ImageSlot) => ImageSlot) => {
    setCoverSlots((prev) => { const next = [...prev]; next[i] = updater(next[i]); return next; });
    setBuildKey((k) => k + 1);
  }, []);

  const onPageConfigChange = useCallback((i: number, updater: (c: PageConfig) => PageConfig) => {
    setPageConfigs((prev) => {
      const next = [...prev];
      next[i] = updater(next[i]);
      return next;
    });
    // Don't rebuild — live-update the sprite scene via the updater callbacks
  }, []);

  const onSpreadPagesChange = useCallback((next: Set<number>) => {
    setSpreadPages(next);
    setBuildKey((k) => k + 1);
  }, []);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true }}>
        <BookScene
          params={params}
          coverSlots={coverSlots}
          pageConfigs={pageConfigs}
          spreadPages={spreadPages}
          buildKey={buildKey}
          bookRef={bookRef}
          spriteScenes={spriteScenes}
          onBuilt={onBuilt}
          onError={onError}
        />
      </Canvas>
      <LeftPanel
        params={params}
        status={status}
        bookRef={bookRef}
        spriteScenes={spriteScenes}
        onParamChange={setParam}
        onPageCountChange={setPageCount}
        onRebuild={rebuild}
      />
      <RightPanel
        params={params}
        coverSlots={coverSlots}
        pageConfigs={pageConfigs}
        spreadPages={spreadPages}
        spriteScenes={spriteScenes}
        currentPage={editorPage}
        onPageChange={setEditorPage}
        onCoverSlotChange={onCoverSlotChange}
        onPageConfigChange={onPageConfigChange}
        onSpreadPagesChange={onSpreadPagesChange}
        onRebuild={rebuild}
      />
      <PageEditor
        currentPage={editorPage}
        pageCount={params.pageCount}
        spreadPages={spreadPages}
        spriteScenes={spriteScenes}
        onPageChange={setEditorPage}
      />
      <div style={{
        position: 'fixed',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#9aa3bf',
        fontFamily: 'monospace',
        fontSize: 12,
        pointerEvents: 'none',
      }}>
        Click + drag pages to turn  |  Orbit: right-click / scroll
      </div>
    </>
  );
}
