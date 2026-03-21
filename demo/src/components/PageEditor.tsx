/**
 * PageEditor — WYSIWYG 2D editor for sprites and elements (React version).
 *
 * Shows the current page's SpriteScene canvas in a floating panel.
 *   - Drag    → move character (x + y / depth simultaneously)
 *   - Scroll  → resize (intrinsicSize)
 *
 * Spread support: when the current page is part of a double-page spread, the
 * editor shows the full double-width canvas with a centre fold line.
 */

import { useRef, useEffect, useCallback } from 'react';
import { Sprite, renderedSize } from '@objectifthunes/react-three-book-theatre';
import type { Positionable, SpriteScene } from '@objectifthunes/react-three-book-theatre';

const DISPLAY_MAX = 300;

interface PageEditorProps {
  currentPage: number;
  pageCount: number;
  spreadPages: Set<number>;
  spriteScenes: React.MutableRefObject<SpriteScene[]>;
  onPageChange: (page: number) => void;
}

export default function PageEditor({ currentPage, pageCount, spreadPages, spriteScenes, onPageChange }: PageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const draggingRef = useRef<Positionable | null>(null);
  const hoveredRef = useRef<Positionable | null>(null);
  const pointerOriginRef = useRef({ x: 0, y: 0 });
  const itemOriginRef = useRef({ x: 0, y: 0 });

  // Redirect right half of spread to its left page
  const isRightOfSpread = spreadPages.has(currentPage - 1);
  const effectiveIdx = isRightOfSpread ? currentPage - 1 : currentPage;
  const isSpread = spreadPages.has(effectiveIdx) || isRightOfSpread;

  const getScene = useCallback(() => spriteScenes.current[effectiveIdx] ?? null, [spriteScenes, effectiveIdx]);

  const getDisplayMetrics = useCallback(() => {
    const ss = getScene();
    const cw = ss?.canvas.width ?? 512;
    const ch = ss?.canvas.height ?? 512;
    const scale = DISPLAY_MAX / Math.max(cw, ch);
    return { cw, ch, dw: Math.round(cw * scale), dh: Math.round(ch * scale), scale };
  }, [getScene]);

  const allItems = useCallback((): Positionable[] => {
    const ss = getScene();
    if (!ss) return [];
    return [...ss.sprites, ...ss.elements];
  }, [getScene]);

  const computeItemBox = useCallback((item: Positionable, ss: SpriteScene) => {
    const sz = renderedSize(item.r, item.intrinsicSize, item.pageDistance);
    const rawTop = item.y - sz;
    const shift = rawTop < 0 ? -rawTop : 0;
    return { sz, top: rawTop + shift, bottom: item.y + shift };
  }, []);

  const hitTest = useCallback((cx: number, cy: number): Positionable | null => {
    const ss = getScene();
    if (!ss) return null;
    const sorted = allItems().slice().sort((a, b) => a.r - b.r);
    for (const item of sorted) {
      const { sz, top, bottom } = computeItemBox(item, ss);
      const halfW = Math.max(sz / 2, 14);
      if (cx >= item.x - halfW && cx <= item.x + halfW && cy >= top && cy <= bottom) {
        return item;
      }
    }
    return null;
  }, [getScene, allItems, computeItemBox]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function render() {
      const ss = getScene();
      const { dw, dh, scale } = getDisplayMetrics();
      canvas!.width = dw;
      canvas!.height = dh;

      ctx.clearRect(0, 0, dw, dh);
      if (ss) {
        ctx.drawImage(ss.canvas, 0, 0, dw, dh);
      } else {
        ctx.fillStyle = '#11131f';
        ctx.fillRect(0, 0, dw, dh);
      }

      // Centre fold line for spread pages
      if (isSpread && ss) {
        const foldX = dw / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(236,242,255,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(foldX, 0);
        ctx.lineTo(foldX, dh);
        ctx.stroke();
        ctx.restore();
      }

      // Draw item overlays
      const items = allItems();
      const hovered = hoveredRef.current;
      const dragging = draggingRef.current;

      for (const item of items) {
        if (!ss) continue;
        const { sz, top } = computeItemBox(item, ss);
        const sx = item.x * scale;
        const sw = sz * scale;
        const sy = top * scale;
        const active = item === hovered || item === dragging;
        const isSpriteType = item instanceof Sprite;

        ctx.save();
        ctx.strokeStyle = active
          ? (isSpriteType ? '#89d8b0' : '#d8b089')
          : 'rgba(236,242,255,0.45)';
        ctx.lineWidth = active ? 2 : 1;
        if (!active) ctx.setLineDash([3, 3]);
        ctx.strokeRect(sx - sw / 2, sy, sw, sw);
        ctx.restore();

        const fs = Math.max(7, Math.min(11, sw * 0.22));
        ctx.save();
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = active
          ? (isSpriteType ? '#89d8b0' : '#d8b089')
          : 'rgba(236,242,255,0.6)';
        ctx.fillText(isSpriteType ? 'S' : 'E', sx - sw / 2 + 3, sy + 3);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [effectiveIdx, isSpread, getScene, getDisplayMetrics, allItems, computeItemBox]);

  const displayToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { scale } = getDisplayMetrics();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  }, [getDisplayMetrics]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const cv = displayToCanvas(e.clientX, e.clientY);
    const hit = hitTest(cv.x, cv.y);
    if (!hit) return;
    draggingRef.current = hit;
    pointerOriginRef.current = cv;
    itemOriginRef.current = { x: hit.x, y: hit.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, [displayToCanvas, hitTest]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const cv = displayToCanvas(e.clientX, e.clientY);
    const dragging = draggingRef.current;
    if (dragging) {
      const ss = getScene();
      const { cw, ch } = getDisplayMetrics();
      const horizonY = ss ? ss.horizonFraction * ch : ch * 0.42;

      dragging.x = Math.max(0, Math.min(cw, itemOriginRef.current.x + (cv.x - pointerOriginRef.current.x)));
      const newY = itemOriginRef.current.y + (cv.y - pointerOriginRef.current.y);
      if (dragging.placement === 'ground') {
        dragging.y = Math.max(horizonY + 1, Math.min(ch, newY));
      } else {
        dragging.y = Math.max(0, Math.min(horizonY - 1, newY));
      }
    } else {
      hoveredRef.current = hitTest(cv.x, cv.y);
    }
  }, [displayToCanvas, hitTest, getScene, getDisplayMetrics]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const cv = displayToCanvas(e.clientX, e.clientY);
    const hit = hitTest(cv.x, cv.y) ?? hoveredRef.current;
    if (!hit) return;
    hit.intrinsicSize = Math.max(1, Math.min(200, hit.intrinsicSize + (e.deltaY > 0 ? -5 : 5)));
  }, [displayToCanvas, hitTest]);

  const displayLabel = isSpread
    ? `Spread ${effectiveIdx + 1}\u2013${effectiveIdx + 2}`
    : `Page ${effectiveIdx + 1}`;

  return (
    <>
      {/* Title */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'rgba(236,242,255,0.58)',
          marginBottom: 8,
        }}
      >
        Page Editor — drag to move · scroll to resize
      </div>

      {/* Page navigation */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <button
          style={NAV_BTN}
          onClick={() => onPageChange(Math.max(0, effectiveIdx - 1))}
          disabled={effectiveIdx <= 0}
        >
          &larr;
        </button>
        <span style={{ fontSize: 12, color: 'rgba(236,242,255,0.85)', minWidth: 60, textAlign: 'center' }}>
          {displayLabel} / {pageCount}
        </span>
        <button
          style={NAV_BTN}
          onClick={() => onPageChange(Math.min(pageCount - 1, effectiveIdx + 1))}
          disabled={effectiveIdx >= pageCount - 1}
        >
          &rarr;
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          borderRadius: 8,
          cursor: draggingRef.current ? 'grabbing' : 'crosshair',
          border: '1px solid rgba(236,242,255,0.12)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      />
    </>
  );
}

const NAV_BTN: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.08)',
  color: '#eef4ff',
  fontFamily: 'inherit',
  fontSize: 13,
  cursor: 'pointer',
};
