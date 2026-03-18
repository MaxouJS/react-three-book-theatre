/**
 * Right panel — cover texture uploads and per-page sprite controls.
 *
 * Pages are navigated one at a time (← / N →).  Each page exposes its own
 * background image, sprite count/size/horizon, and per-character controls.
 *
 * Spread support: eligible facing-page pairs can be toggled into a double-page
 * spread.  When viewing a spread, the right half redirects to the spread's
 * left page and shows shared sprite controls.
 */

import { useState } from 'react';
import { loadImage, drawImageFit, getSpreadPairs } from '@objectifthunes/react-three-book-theatre';
import type { SpritePlacement, ImageFit, SpriteScene } from '@objectifthunes/react-three-book-theatre';
import type {
  ImageSlot,
  ImageFitMode,
  DemoParams,
  PageConfig,
  CharacterConfig,
  ElementConfig,
} from '../state';
import { DEFAULT_CHARACTER, DEFAULT_ELEMENT } from '../state';
import { PANEL_STYLE, SectionTitle, Slider, Checkbox, ColorPicker } from './UiHelpers';

// ── Shared styles ────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  margin: '0 0 8px',
  padding: 10,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(236, 242, 255, 0.12)',
};

const THUMB_STYLE: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 6,
  objectFit: 'cover',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(236,242,255,0.15)',
  flexShrink: 0,
};

const MINI_BTN: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.08)',
  color: '#eef4ff',
  fontFamily: 'inherit',
  fontSize: 11,
  cursor: 'pointer',
};

const MINI_SELECT: React.CSSProperties = {
  padding: '3px 6px',
  borderRadius: 6,
  border: '1px solid rgba(236,242,255,0.22)',
  background: 'rgba(255,255,255,0.06)',
  color: '#eef4ff',
  fontSize: 11,
  fontFamily: 'inherit',
};

// ── Thumbnail rendering ──────────────────────────────────────────────────────

function renderCoverThumbnail(slot: ImageSlot, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (slot.useImage && slot.image) {
    const m = slot.fullBleed ? 0 : 14;
    drawImageFit(ctx, slot.image, m, m, 128 - m * 2, 128 - m * 2, slot.fitMode as ImageFit);
  }
  return canvas.toDataURL();
}

function renderPageThumbnail(image: HTMLImageElement | null, color: string, fit: ImageFit = 'cover', fullBleed = true): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (image) {
    const m = fullBleed ? 0 : 14;
    drawImageFit(ctx, image, m, m, 128 - m * 2, 128 - m * 2, fit);
  }
  return canvas.toDataURL();
}

function renderImageThumbnail(image: HTMLImageElement | null, color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  if (image) {
    drawImageFit(ctx, image, 0, 0, 128, 128, 'cover');
  }
  return canvas.toDataURL();
}

// ── Image slot card ──────────────────────────────────────────────────────────

interface ImageSlotCardProps {
  label: string;
  slot: ImageSlot;
  bgColor: string;
  showFitControls?: boolean;
  onFitModeChange?: (mode: ImageFitMode) => void;
  onFullBleedChange?: (v: boolean) => void;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

function ImageSlotCard({
  label, slot, bgColor, showFitControls,
  onFitModeChange, onFullBleedChange, onClear, onFileChange,
}: ImageSlotCardProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={renderCoverThumbnail(slot, bgColor)} alt={label} style={THUMB_STYLE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>
            {label}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {showFitControls && (
              <>
                <select
                  value={slot.fitMode}
                  style={MINI_SELECT}
                  onChange={(e) => onFitModeChange?.(e.target.value as ImageFitMode)}
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="fill">Fill</option>
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(236,242,255,0.78)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={slot.fullBleed}
                    style={{ width: 13, height: 13 }}
                    onChange={(e) => onFullBleedChange?.(e.target.checked)}
                  />
                  Bleed
                </label>
              </>
            )}
            <button type="button" style={MINI_BTN} onClick={onClear}>Clear</button>
          </div>
          <div style={{ marginTop: 5 }}>
            <input
              type="file"
              accept="image/*"
              style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Simple image card (for character idle/walk/action + element image) ────────

interface SimpleImageCardProps {
  label: string;
  image: HTMLImageElement | null;
  bgColor: string;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

function SimpleImageCard({ label, image, bgColor, onClear, onFileChange }: SimpleImageCardProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={renderImageThumbnail(image, bgColor)} alt={label} style={THUMB_STYLE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>
            {label}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" style={MINI_BTN} onClick={onClear}>Clear</button>
          </div>
          <div style={{ marginTop: 5 }}>
            <input
              type="file"
              accept="image/*"
              style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Placement toggle ─────────────────────────────────────────────────────────

function PlacementToggle({
  value,
  onChange,
}: {
  value: SpritePlacement;
  onChange: (p: SpritePlacement) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
      {(['ground', 'sky'] as SpritePlacement[]).map((p) => (
        <button
          key={p}
          type="button"
          style={{
            ...MINI_BTN,
            ...(value === p
              ? { background: 'rgba(137,216,176,0.25)', borderColor: '#89d8b0' }
              : {}),
          }}
          onClick={() => onChange(p)}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Character editor ─────────────────────────────────────────────────────────

interface CharacterEditorProps {
  index: number;
  config: CharacterConfig;
  maxDistance: number;
  bgColor: string;
  spriteScene: SpriteScene | null;
  onChange: (updater: (c: CharacterConfig) => CharacterConfig) => void;
}

function CharacterEditor({ index, config, maxDistance, bgColor, spriteScene, onChange }: CharacterEditorProps) {
  const step = maxDistance >= 10 ? 0.5 : 0.1;

  return (
    <>
      <SectionTitle text={`Character ${index + 1}`} />
      <Checkbox
        label="Animated"
        value={config.animated}
        onChange={(v) => {
          onChange((c) => ({ ...c, animated: v }));
          spriteScene?.updateSprite(index, { animated: v });
        }}
      />
      <Checkbox
        label="Depth Scaling"
        value={config.depthScaling}
        onChange={(v) => {
          onChange((c) => ({ ...c, depthScaling: v }));
          spriteScene?.updateSprite(index, { depthScaling: v });
        }}
      />
      <PlacementToggle
        value={config.placement}
        onChange={(p) => {
          onChange((c) => ({ ...c, placement: p }));
          spriteScene?.updateSprite(index, { placement: p });
        }}
      />
      <Slider
        label="Distance (m)" min={0} max={maxDistance} step={step} value={config.distance}
        onChange={(v) => {
          onChange((c) => ({ ...c, distance: v }));
          spriteScene?.updateSprite(index, { distance: v });
        }}
      />
      <Slider
        label="Size" min={1} max={200} step={1} value={config.intrinsicSize}
        onChange={(v) => {
          onChange((c) => ({ ...c, intrinsicSize: v }));
          spriteScene?.updateSprite(index, { intrinsicSize: v });
        }}
      />
      <Slider
        label="Patrol Radius (m)" min={0} max={maxDistance} step={step} value={config.patrolRadius}
        onChange={(v) => {
          onChange((c) => ({ ...c, patrolRadius: v }));
          spriteScene?.updateSprite(index, { patrolRadius: v });
        }}
      />
      <SimpleImageCard
        label="Idle" image={config.idleImage} bgColor={bgColor}
        onClear={() => {
          onChange((c) => ({ ...c, idleImage: null }));
          spriteScene?.updateSprite(index, { idleImage: null });
        }}
        onFileChange={async (file) => {
          const result = await loadImage(file);
          const img = result?.image ?? null;
          onChange((c) => ({ ...c, idleImage: img }));
          spriteScene?.updateSprite(index, { idleImage: img });
        }}
      />
      <SimpleImageCard
        label="Walk" image={config.walkImage} bgColor={bgColor}
        onClear={() => {
          onChange((c) => ({ ...c, walkImage: null }));
          spriteScene?.updateSprite(index, { walkImage: null });
        }}
        onFileChange={async (file) => {
          const result = await loadImage(file);
          const img = result?.image ?? null;
          onChange((c) => ({ ...c, walkImage: img }));
          spriteScene?.updateSprite(index, { walkImage: img });
        }}
      />
      <SimpleImageCard
        label="Action" image={config.actionImage} bgColor={bgColor}
        onClear={() => {
          onChange((c) => ({ ...c, actionImage: null }));
          spriteScene?.updateSprite(index, { actionImage: null });
        }}
        onFileChange={async (file) => {
          const result = await loadImage(file);
          const img = result?.image ?? null;
          onChange((c) => ({ ...c, actionImage: img }));
          spriteScene?.updateSprite(index, { actionImage: img });
        }}
      />
    </>
  );
}

// ── Element editor ───────────────────────────────────────────────────────────

interface ElementEditorProps {
  index: number;
  config: ElementConfig;
  maxDistance: number;
  bgColor: string;
  spriteScene: SpriteScene | null;
  onChange: (updater: (c: ElementConfig) => ElementConfig) => void;
  onRemove: () => void;
}

function ElementEditor({ index, config, maxDistance, bgColor, spriteScene, onChange, onRemove }: ElementEditorProps) {
  const step = maxDistance >= 10 ? 0.5 : 0.1;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 12, color: 'rgba(236,242,255,0.92)' }}>
          Element {index + 1}
        </div>
        <button type="button" style={{ ...MINI_BTN, color: '#f08080' }} onClick={onRemove}>
          Remove
        </button>
      </div>
      <Checkbox
        label="Depth Scaling"
        value={config.depthScaling}
        onChange={(v) => {
          onChange((c) => ({ ...c, depthScaling: v }));
          spriteScene?.updateElement(index, { depthScaling: v });
        }}
      />
      <PlacementToggle
        value={config.placement}
        onChange={(p) => {
          onChange((c) => ({ ...c, placement: p }));
          spriteScene?.updateElement(index, { placement: p });
        }}
      />
      <Slider
        label="Distance (m)" min={0} max={maxDistance} step={step} value={config.distance}
        onChange={(v) => {
          onChange((c) => ({ ...c, distance: v }));
          spriteScene?.updateElement(index, { distance: v });
        }}
      />
      <Slider
        label="Size" min={1} max={200} step={1} value={config.intrinsicSize}
        onChange={(v) => {
          onChange((c) => ({ ...c, intrinsicSize: v }));
          spriteScene?.updateElement(index, { intrinsicSize: v });
        }}
      />
      <SimpleImageCard
        label="Image" image={config.image} bgColor={bgColor}
        onClear={() => {
          onChange((c) => ({ ...c, image: null }));
          spriteScene?.updateElement(index, { image: null });
        }}
        onFileChange={async (file) => {
          const result = await loadImage(file);
          const img = result?.image ?? null;
          onChange((c) => ({ ...c, image: img }));
          spriteScene?.updateElement(index, { image: img });
        }}
      />
    </>
  );
}

// ── Page background card ──────────────────────────────────────────────────────

interface PageBackgroundCardProps {
  label: string;
  pageIndex: number;
  config: PageConfig;
  bgColor: string;
  spriteScene: SpriteScene | null;
  onChange: (updater: (c: PageConfig) => PageConfig) => void;
  onRebuild: () => void;
}

function PageBackgroundCard({ label, pageIndex, config, bgColor, spriteScene, onChange, onRebuild }: PageBackgroundCardProps) {
  const thumbSrc = renderPageThumbnail(config.backgroundImage, bgColor, config.backgroundImageFit, config.backgroundFullBleed);

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={thumbSrc} alt={label} style={THUMB_STYLE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>
            {label}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={config.backgroundImageFit}
              style={MINI_SELECT}
              onChange={(e) => {
                const fit = e.target.value as ImageFit;
                onChange((c) => ({ ...c, backgroundImageFit: fit }));
                if (spriteScene) spriteScene.backgroundImageFit = fit;
              }}
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(236,242,255,0.78)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.backgroundFullBleed}
                style={{ width: 13, height: 13 }}
                onChange={(e) => onChange((c) => ({ ...c, backgroundFullBleed: e.target.checked }))}
              />
              Bleed
            </label>
            <button
              type="button"
              style={MINI_BTN}
              onClick={() => {
                onChange((c) => ({ ...c, backgroundImage: null }));
                if (spriteScene) spriteScene.backgroundImage = null;
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ marginTop: 5 }}>
            <input
              type="file"
              accept="image/*"
              style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }}
              onChange={async (e) => {
                const result = await loadImage(e.target.files?.[0] ?? null);
                const img = result?.image ?? null;
                onChange((c) => ({ ...c, backgroundImage: img }));
                if (spriteScene) spriteScene.backgroundImage = img;
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface RightPanelProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageConfigs: PageConfig[];
  spreadPages: Set<number>;
  spriteScenes: React.MutableRefObject<SpriteScene[]>;
  currentPage: number;
  onPageChange: (page: number) => void;
  onCoverSlotChange: (index: number, updater: (s: ImageSlot) => ImageSlot) => void;
  onPageConfigChange: (index: number, updater: (c: PageConfig) => PageConfig) => void;
  onSpreadPagesChange: (next: Set<number>) => void;
  onRebuild: () => void;
}

export default function RightPanel({
  params,
  coverSlots,
  pageConfigs,
  spreadPages,
  spriteScenes,
  currentPage,
  onPageChange,
  onCoverSlotChange,
  onPageConfigChange,
  onSpreadPagesChange,
  onRebuild,
}: RightPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const coverLabels = ['Front Outer', 'Front Inner', 'Back Inner', 'Back Outer'];

  // Redirect right half of spread to its left page
  const isRightOfSpread = spreadPages.has(currentPage - 1);
  const effectiveIdx = isRightOfSpread ? currentPage - 1 : Math.min(currentPage, params.pageCount - 1);
  const isSpread = spreadPages.has(effectiveIdx);
  const cfg = pageConfigs[effectiveIdx];
  const scene = spriteScenes.current[effectiveIdx] ?? null;

  const eligibleSpreads = new Set(getSpreadPairs(params.pageCount));

  const pageLabel = isSpread
    ? `Spread ${effectiveIdx + 1}\u2013${effectiveIdx + 2}`
    : `Page ${effectiveIdx + 1}`;

  return (
    <div style={{ ...PANEL_STYLE, right: 10 }}>
      <h1
        style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, position: 'relative', cursor: 'pointer' }}
        onClick={() => setCollapsed((c) => !c)}
      >
        Textures & Sprites
        <span style={{
          position: 'absolute', top: 0, right: 0, width: 22, height: 22, padding: 0,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(236,242,255,0.15)',
          borderRadius: 6, color: 'rgba(236,242,255,0.68)', fontSize: 11, lineHeight: '22px',
          textAlign: 'center', display: 'inline-block',
        }}>
          {collapsed ? '\u25B8' : '\u25BE'}
        </span>
      </h1>

      {!collapsed && (
        <div>
          {/* Cover Textures */}
          <SectionTitle text="Cover Textures" />
          {coverSlots.map((slot, i) => (
            <ImageSlotCard
              key={i}
              label={coverLabels[i]}
              slot={slot}
              bgColor={params.coverColor}
              showFitControls
              onFitModeChange={(mode) => onCoverSlotChange(i, (s) => ({ ...s, fitMode: mode }))}
              onFullBleedChange={(v) => onCoverSlotChange(i, (s) => ({ ...s, fullBleed: v }))}
              onClear={() => {
                if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
                onCoverSlotChange(i, () => ({ ...slot, image: null, objectUrl: null, useImage: false }));
              }}
              onFileChange={async (file) => {
                const result = await loadImage(file);
                if (!result) return;
                if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
                onCoverSlotChange(i, () => ({ ...slot, image: result.image, objectUrl: result.objectUrl, useImage: true }));
              }}
            />
          ))}

          {/* Page Navigation */}
          <SectionTitle text="Page" />

          {/* Spread checkbox for eligible pairs */}
          {eligibleSpreads.has(effectiveIdx) && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px', fontSize: 12, color: 'rgba(236,242,255,0.92)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isSpread}
                style={{ width: 14, height: 14 }}
                onChange={(e) => {
                  const next = new Set(spreadPages);
                  if (e.target.checked) next.add(effectiveIdx); else next.delete(effectiveIdx);
                  onSpreadPagesChange(next);
                }}
              />
              Double-page spread: Pages {effectiveIdx + 1}&ndash;{effectiveIdx + 2}
            </label>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              style={MINI_BTN}
              disabled={effectiveIdx <= 0}
              onClick={() => onPageChange(effectiveIdx - 1)}
            >
              ←
            </button>
            <input
              type="number"
              min={1}
              max={params.pageCount}
              value={effectiveIdx + 1}
              style={{ ...MINI_SELECT, width: 42, textAlign: 'center' }}
              onChange={(e) => {
                const v = Math.max(1, Math.min(params.pageCount, parseInt(e.target.value, 10) || 1)) - 1;
                onPageChange(v);
              }}
            />
            <span style={{ fontSize: 12, color: 'rgba(236,242,255,0.7)' }}>
              / {params.pageCount}
            </span>
            {isSpread && (
              <span style={{ fontSize: 11, color: 'rgba(137,216,176,0.85)' }}>
                (Spread {effectiveIdx + 1}&ndash;{effectiveIdx + 2})
              </span>
            )}
            <button
              type="button"
              style={MINI_BTN}
              disabled={effectiveIdx >= params.pageCount - 1}
              onClick={() => onPageChange(effectiveIdx + 1)}
            >
              →
            </button>
          </div>

          {/* Page background card */}
          <PageBackgroundCard
            label={pageLabel}
            pageIndex={effectiveIdx}
            config={cfg}
            bgColor={params.pageColor}
            spriteScene={scene}
            onChange={(updater) => onPageConfigChange(effectiveIdx, updater)}
            onRebuild={onRebuild}
          />

          {/* Sprites section */}
          <SectionTitle text="Sprites" />
          <Slider
            label="Horizon" min={0} max={1} step={0.01} value={cfg.horizonFraction}
            onChange={(v) => {
              onPageConfigChange(effectiveIdx, (c) => ({ ...c, horizonFraction: v }));
              if (scene) scene.horizonFraction = v;
            }}
          />
          <Slider
            label="Scene Depth (m)" min={1} max={200} step={1} value={cfg.pageDistance}
            onChange={(v) => {
              onPageConfigChange(effectiveIdx, (c) => ({ ...c, pageDistance: v }));
              if (scene) scene.pageDistance = v;
            }}
          />

          {/* Characters */}
          {cfg.characters.map((ch, chIdx) => (
            <CharacterEditor
              key={chIdx}
              index={chIdx}
              config={ch}
              maxDistance={cfg.pageDistance}
              bgColor={cfg.background}
              spriteScene={scene}
              onChange={(updater) => {
                onPageConfigChange(effectiveIdx, (c) => {
                  const chars = [...c.characters];
                  chars[chIdx] = updater(chars[chIdx]);
                  return { ...c, characters: chars };
                });
              }}
            />
          ))}

          {/* Elements */}
          <SectionTitle text="Elements" />
          {cfg.elements.map((el, elIdx) => (
            <ElementEditor
              key={elIdx}
              index={elIdx}
              config={el}
              maxDistance={cfg.pageDistance}
              bgColor={cfg.background}
              spriteScene={scene}
              onChange={(updater) => {
                onPageConfigChange(effectiveIdx, (c) => {
                  const els = [...c.elements];
                  els[elIdx] = updater(els[elIdx]);
                  return { ...c, elements: els };
                });
              }}
              onRemove={() => {
                if (scene) {
                  const spriteEl = scene.elements[elIdx];
                  if (spriteEl) scene.removeElement(spriteEl);
                }
                onPageConfigChange(effectiveIdx, (c) => ({
                  ...c,
                  elements: c.elements.filter((_, i) => i !== elIdx),
                }));
              }}
            />
          ))}

          <button
            type="button"
            style={{ ...MINI_BTN, width: '100%', marginTop: 4 }}
            onClick={() => {
              onPageConfigChange(effectiveIdx, (c) => ({
                ...c,
                elements: [...c.elements, { ...DEFAULT_ELEMENT }],
              }));
              scene?.addElement({
                placement: DEFAULT_ELEMENT.placement,
                distance: DEFAULT_ELEMENT.distance,
                intrinsicSize: DEFAULT_ELEMENT.intrinsicSize,
                depthScaling: DEFAULT_ELEMENT.depthScaling,
              });
            }}
          >
            + Add Element
          </button>
        </div>
      )}
    </div>
  );
}
