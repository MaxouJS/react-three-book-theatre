import { useCallback } from 'react';
import { loadImage, drawImageFit } from '@objectifthunes/react-three-book-theatre';
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
import { PANEL_STYLE, SectionTitle, Slider, Select, ColorPicker } from './UiHelpers';

interface RightPanelProps {
  params: DemoParams;
  coverSlots: ImageSlot[];
  pageConfigs: PageConfig[];
  spriteScenes: React.MutableRefObject<SpriteScene[]>;
  onCoverSlotChange: (index: number, updater: (s: ImageSlot) => ImageSlot) => void;
  onPageConfigChange: (index: number, updater: (c: PageConfig) => PageConfig) => void;
  onRebuild: () => void;
}

// ── Cover texture card ──────────────────────────────────────────────────────

const THUMB_STYLE: React.CSSProperties = { width: 64, height: 64, borderRadius: 6, objectFit: 'cover', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(236,242,255,0.15)', flexShrink: 0 };
const CARD_STYLE: React.CSSProperties = { margin: '0 0 8px', padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(236,242,255,0.12)' };
const MINI_BTN: React.CSSProperties = { padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(236,242,255,0.22)', background: 'rgba(255,255,255,0.08)', color: '#eef4ff', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' };
const MINI_SELECT: React.CSSProperties = { padding: '3px 6px', borderRadius: 6, border: '1px solid rgba(236,242,255,0.22)', background: 'rgba(255,255,255,0.06)', color: '#eef4ff', fontSize: 11, fontFamily: 'inherit' };

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

interface CoverCardProps {
  label: string; slot: ImageSlot; bgColor: string;
  onFitModeChange: (mode: ImageFitMode) => void;
  onFullBleedChange: (v: boolean) => void;
  onClear: () => void;
  onFileChange: (file: File | null) => void;
}

function CoverCard({ label, slot, bgColor, onFitModeChange, onFullBleedChange, onClear, onFileChange }: CoverCardProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <img src={renderCoverThumbnail(slot, bgColor)} alt={label} style={THUMB_STYLE} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>{label}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={slot.fitMode} style={MINI_SELECT} onChange={(e) => onFitModeChange(e.target.value as ImageFitMode)}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Fill</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(236,242,255,0.78)', cursor: 'pointer' }}>
              <input type="checkbox" checked={slot.fullBleed} style={{ width: 13, height: 13 }} onChange={(e) => onFullBleedChange(e.target.checked)} />
              Bleed
            </label>
            <button type="button" style={MINI_BTN} onClick={onClear}>Clear</button>
          </div>
          <div style={{ marginTop: 5 }}>
            <input type="file" accept="image/*" style={{ width: '100%', fontSize: 11, color: 'rgba(236,242,255,0.76)' }} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Character / Element editors ─────────────────────────────────────────────

interface CharacterEditorProps {
  index: number;
  config: CharacterConfig;
  maxDistance: number;
  spriteScene: SpriteScene | null;
  onChange: (updater: (c: CharacterConfig) => CharacterConfig) => void;
}

function CharacterEditor({ index, config, maxDistance, spriteScene, onChange }: CharacterEditorProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: 'rgba(236,242,255,0.92)' }}>
        Character {index + 1}
      </div>
      <Select
        label="Placement"
        value={config.placement}
        options={[{ value: 'ground', label: 'Ground' }, { value: 'sky', label: 'Sky' }]}
        onChange={(v) => {
          onChange((c) => ({ ...c, placement: v as SpritePlacement }));
          spriteScene?.updateSprite(index, { placement: v as SpritePlacement });
        }}
      />
      <Slider
        label="Distance (m)" min={0.1} max={maxDistance} step={0.1} value={config.distance}
        onChange={(v) => {
          onChange((c) => ({ ...c, distance: v }));
          spriteScene?.updateSprite(index, { distance: v });
        }}
      />
      <Slider
        label="Size" min={10} max={200} step={1} value={config.intrinsicSize}
        onChange={(v) => {
          onChange((c) => ({ ...c, intrinsicSize: v }));
          spriteScene?.updateSprite(index, { intrinsicSize: v });
        }}
      />
      <div style={{ fontSize: 11, color: 'rgba(236,242,255,0.6)', marginTop: 4 }}>
        Idle image:
        <input type="file" accept="image/*" style={{ fontSize: 10, color: 'rgba(236,242,255,0.6)' }}
          onChange={async (e) => {
            const result = await loadImage(e.target.files?.[0] ?? null);
            const img = result?.image ?? null;
            onChange((c) => ({ ...c, idleImage: img }));
            spriteScene?.updateSprite(index, { idleImage: img });
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(236,242,255,0.6)', marginTop: 2 }}>
        Walk image:
        <input type="file" accept="image/*" style={{ fontSize: 10, color: 'rgba(236,242,255,0.6)' }}
          onChange={async (e) => {
            const result = await loadImage(e.target.files?.[0] ?? null);
            const img = result?.image ?? null;
            onChange((c) => ({ ...c, walkImage: img }));
            spriteScene?.updateSprite(index, { walkImage: img });
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'rgba(236,242,255,0.6)', marginTop: 2 }}>
        Action image:
        <input type="file" accept="image/*" style={{ fontSize: 10, color: 'rgba(236,242,255,0.6)' }}
          onChange={async (e) => {
            const result = await loadImage(e.target.files?.[0] ?? null);
            const img = result?.image ?? null;
            onChange((c) => ({ ...c, actionImage: img }));
            spriteScene?.updateSprite(index, { actionImage: img });
          }}
        />
      </div>
    </div>
  );
}

interface ElementEditorProps {
  index: number;
  config: ElementConfig;
  maxDistance: number;
  spriteScene: SpriteScene | null;
  onChange: (updater: (c: ElementConfig) => ElementConfig) => void;
  onRemove: () => void;
}

function ElementEditor({ index, config, maxDistance, spriteScene, onChange, onRemove }: ElementEditorProps) {
  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: 'rgba(236,242,255,0.92)' }}>Element {index + 1}</span>
        <button type="button" style={{ ...MINI_BTN, color: '#ff9090' }} onClick={onRemove}>Remove</button>
      </div>
      <Select
        label="Placement"
        value={config.placement}
        options={[{ value: 'ground', label: 'Ground' }, { value: 'sky', label: 'Sky' }]}
        onChange={(v) => {
          onChange((c) => ({ ...c, placement: v as SpritePlacement }));
          spriteScene?.updateElement(index, { placement: v as SpritePlacement });
        }}
      />
      <Slider
        label="Distance (m)" min={0.1} max={maxDistance} step={0.1} value={config.distance}
        onChange={(v) => {
          onChange((c) => ({ ...c, distance: v }));
          spriteScene?.updateElement(index, { distance: v });
        }}
      />
      <Slider
        label="Size" min={10} max={200} step={1} value={config.intrinsicSize}
        onChange={(v) => {
          onChange((c) => ({ ...c, intrinsicSize: v }));
          spriteScene?.updateElement(index, { intrinsicSize: v });
        }}
      />
      <div style={{ fontSize: 11, color: 'rgba(236,242,255,0.6)', marginTop: 4 }}>
        Image:
        <input type="file" accept="image/*" style={{ fontSize: 10, color: 'rgba(236,242,255,0.6)' }}
          onChange={async (e) => {
            const result = await loadImage(e.target.files?.[0] ?? null);
            const img = result?.image ?? null;
            onChange((c) => ({ ...c, image: img }));
            spriteScene?.updateElement(index, { image: img });
          }}
        />
      </div>
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function RightPanel({
  params,
  coverSlots,
  pageConfigs,
  spriteScenes,
  onCoverSlotChange,
  onPageConfigChange,
  onRebuild,
}: RightPanelProps) {
  const coverLabels = ['Front Outer', 'Front Inner', 'Back Inner', 'Back Outer'];

  const makeCoverHandlers = useCallback((index: number, slot: ImageSlot) => ({
    onFitModeChange: (mode: ImageFitMode) => onCoverSlotChange(index, (s) => ({ ...s, fitMode: mode })),
    onFullBleedChange: (fullBleed: boolean) => onCoverSlotChange(index, (s) => ({ ...s, fullBleed })),
    onClear: () => {
      if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      onCoverSlotChange(index, () => ({ ...slot, image: null, objectUrl: null, useImage: false }));
    },
    onFileChange: async (file: File | null) => {
      const result = await loadImage(file);
      if (!result) return;
      if (slot.objectUrl) URL.revokeObjectURL(slot.objectUrl);
      onCoverSlotChange(index, () => ({ ...slot, image: result.image, objectUrl: result.objectUrl, useImage: true }));
    },
  }), [onCoverSlotChange]);

  return (
    <div style={{ ...PANEL_STYLE, right: 10 }}>
      <h1 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>Textures & Theatre</h1>

      <SectionTitle text="Cover Textures" />
      {coverSlots.map((slot, i) => (
        <CoverCard key={i} label={coverLabels[i]} slot={slot} bgColor={params.coverColor} {...makeCoverHandlers(i, slot)} />
      ))}

      <SectionTitle text="Pages" />
      {pageConfigs.slice(0, params.pageCount).map((cfg, pageIdx) => {
        const scene = spriteScenes.current[pageIdx] ?? null;
        return (
          <div key={pageIdx} style={{ ...CARD_STYLE, padding: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#b8d4ff' }}>
              Page {pageIdx + 1}
            </div>

            {/* Scene settings */}
            <Slider
              label="Horizon" min={0.1} max={0.9} step={0.01} value={cfg.horizonFraction}
              onChange={(v) => {
                onPageConfigChange(pageIdx, (c) => ({ ...c, horizonFraction: v }));
                if (scene) scene.horizonFraction = v;
              }}
            />
            <Slider
              label="Scene Depth (m)" min={1} max={30} step={0.5} value={cfg.pageDistance}
              onChange={(v) => {
                onPageConfigChange(pageIdx, (c) => ({ ...c, pageDistance: v }));
                if (scene) scene.pageDistance = v;
              }}
            />
            <ColorPicker
              label="Background" value={cfg.background}
              onChange={(v) => {
                onPageConfigChange(pageIdx, (c) => ({ ...c, background: v }));
                if (scene) scene.background = v;
              }}
            />

            {/* Background image */}
            <div style={{ fontSize: 11, color: 'rgba(236,242,255,0.6)', marginBottom: 6 }}>
              Background image:
              <input type="file" accept="image/*" style={{ fontSize: 10, color: 'rgba(236,242,255,0.6)' }}
                onChange={async (e) => {
                  const result = await loadImage(e.target.files?.[0] ?? null);
                  const img = result?.image ?? null;
                  onPageConfigChange(pageIdx, (c) => ({ ...c, backgroundImage: img }));
                  if (scene) scene.backgroundImage = img;
                }}
              />
            </div>

            {/* Characters */}
            <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(236,242,255,0.5)', fontWeight: 700, margin: '8px 0 4px' }}>
              Characters
            </div>
            {cfg.characters.map((ch, chIdx) => (
              <CharacterEditor
                key={chIdx}
                index={chIdx}
                config={ch}
                maxDistance={cfg.pageDistance}
                spriteScene={scene}
                onChange={(updater) => {
                  onPageConfigChange(pageIdx, (c) => {
                    const chars = [...c.characters];
                    chars[chIdx] = updater(chars[chIdx]);
                    return { ...c, characters: chars };
                  });
                }}
              />
            ))}

            {/* Elements */}
            <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(236,242,255,0.5)', fontWeight: 700, margin: '8px 0 4px' }}>
              Elements
            </div>
            {cfg.elements.map((el, elIdx) => (
              <ElementEditor
                key={elIdx}
                index={elIdx}
                config={el}
                maxDistance={cfg.pageDistance}
                spriteScene={scene}
                onChange={(updater) => {
                  onPageConfigChange(pageIdx, (c) => {
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
                  onPageConfigChange(pageIdx, (c) => ({
                    ...c,
                    elements: c.elements.filter((_, i) => i !== elIdx),
                  }));
                }}
              />
            ))}

            <button
              type="button"
              style={{ ...MINI_BTN, width: '100%', marginTop: 4, padding: '5px 8px' }}
              onClick={() => {
                onPageConfigChange(pageIdx, (c) => ({
                  ...c,
                  elements: [...c.elements, { ...DEFAULT_ELEMENT }],
                }));
                scene?.addElement({
                  placement: DEFAULT_ELEMENT.placement,
                  distance: DEFAULT_ELEMENT.distance,
                  intrinsicSize: DEFAULT_ELEMENT.intrinsicSize,
                });
              }}
            >
              + Add Element
            </button>
          </div>
        );
      })}
    </div>
  );
}
