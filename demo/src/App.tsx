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
import { PANEL_STYLE } from './components/UiHelpers';
import BookScene from './components/BookScene';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import PageEditor from './components/PageEditor';

const MAX_PAGES = 40;

type Tab = 'book' | 'textures' | 'editor';

const TAB_BTN: React.CSSProperties = {
  flex: 1, padding: '6px 0', border: '1px solid rgba(236,242,255,0.15)',
  borderRadius: 8, background: 'rgba(255,255,255,0.04)',
  color: 'rgba(236,242,255,0.55)', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

const TAB_BTN_ACTIVE: React.CSSProperties = {
  ...TAB_BTN, background: 'rgba(137,216,176,0.18)', color: '#89d8b0', borderColor: 'rgba(137,216,176,0.35)',
};

const TOGGLE_BTN: React.CSSProperties = {
  position: 'fixed', top: 14, left: 14, zIndex: 10, padding: '8px 14px',
  borderRadius: 10, border: '1px solid rgba(236,242,255,0.2)',
  background: 'rgba(8, 10, 18, 0.7)', backdropFilter: 'blur(8px)', color: '#ecf2ff',
  fontFamily: "'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif",
  fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
};

const CLOSE_BTN: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid rgba(236,242,255,0.15)', borderRadius: 6,
  background: 'rgba(255,255,255,0.04)', color: 'rgba(236,242,255,0.5)',
  fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', lineHeight: 1,
};

export default function App() {
  const [params, setParams] = useState<DemoParams>(defaultParams);
  const [sceneKey, setSceneKey] = useState(0);
  const [coverSlots, setCoverSlots] = useState<ImageSlot[]>(() =>
    Array.from({ length: 4 }, () => ({ ...EMPTY_SLOT })),
  );
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>(() =>
    Array.from({ length: MAX_PAGES }, () => createDefaultPageConfig()),
  );
  const [spreadPages, setSpreadPages] = useState<Set<number>>(() => new Set());
  const [status, setStatus] = useState('Building...');
  const [editorPage, setEditorPage] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('book');
  const [panelOpen, setPanelOpen] = useState(true);
  const bookRef = useRef<ThreeBook | null>(null);
  const spriteScenes = useRef<SpriteScene[]>([]);

  const rebuildScenes = useCallback(() => setSceneKey((k) => k + 1), []);

  const forceRebuild = useCallback(() => setSceneKey((k) => k + 1), []);

  const setParam = useCallback(<K extends keyof DemoParams>(key: K, value: DemoParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setPageCount = useCallback((count: number) => {
    setParams((prev) => ({ ...prev, pageCount: count }));
    // Ensure we have enough page configs
    setPageConfigs((prev) => {
      if (prev.length >= count) return prev;
      return [...prev, ...Array.from({ length: count - prev.length }, () => createDefaultPageConfig())];
    });
  }, []);

  const onBuilt = useCallback((book: ThreeBook) => {
    bookRef.current = book;
    setStatus(`Book built: ${book.paperCount} papers, ${params.pageCount} sprite scenes`);
  }, [params.pageCount]);

  const onError = useCallback((err: Error) => setStatus(`Error: ${err.message}`), []);

  const onCoverSlotChange = useCallback((i: number, updater: (s: ImageSlot) => ImageSlot) => {
    setCoverSlots((prev) => { const next = [...prev]; next[i] = updater(next[i]); return next; });
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
  }, []);

  return (
    <>
      <Canvas shadows camera={{ position: [0, 2, 5], fov: 45 }} style={{ position: 'fixed', inset: 0 }} gl={{ antialias: true }}>
        <BookScene
          params={params}
          coverSlots={coverSlots}
          pageConfigs={pageConfigs}
          spreadPages={spreadPages}
          sceneKey={sceneKey}
          bookRef={bookRef}
          spriteScenes={spriteScenes}
          onBuilt={onBuilt}
          onError={onError}
        />
      </Canvas>

      {panelOpen ? (
        <div
          style={{ ...PANEL_STYLE, left: 10, width: 'min(92vw, 380px)' }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>react-three-book-theatre</h1>
              <p style={{ margin: '3px 0 0', color: 'rgba(236,242,255,0.55)', fontSize: 11 }}>
                Drag to turn · right-click + wheel to orbit
              </p>
            </div>
            <button style={CLOSE_BTN} onClick={() => setPanelOpen(false)} title="Hide panel">{'\u2715'}</button>
          </div>
          <div style={{ marginBottom: 8, color: '#8cf0bf', fontWeight: 700, fontSize: 12 }}>{status}</div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {(['book', 'textures', 'editor'] as Tab[]).map((tab) => (
              <button
                key={tab}
                style={activeTab === tab ? TAB_BTN_ACTIVE : TAB_BTN}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'book' ? 'Book' : tab === 'textures' ? 'Textures' : 'Editor'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ display: activeTab === 'book' ? 'block' : 'none' }}>
            <LeftPanel
              params={params}
              bookRef={bookRef}
              spriteScenes={spriteScenes}
              onParamChange={setParam}
              onPageCountChange={setPageCount}
              onRebuild={forceRebuild}
            />
          </div>
          <div style={{ display: activeTab === 'textures' ? 'block' : 'none' }}>
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
              onRebuild={rebuildScenes}
            />
          </div>
          <div style={{ display: activeTab === 'editor' ? 'block' : 'none' }}>
            <PageEditor
              currentPage={editorPage}
              pageCount={params.pageCount}
              spreadPages={spreadPages}
              spriteScenes={spriteScenes}
              onPageChange={setEditorPage}
            />
          </div>
        </div>
      ) : (
        <button style={TOGGLE_BTN} onClick={() => setPanelOpen(true)}>{'\u2630'} Panel</button>
      )}
    </>
  );
}
