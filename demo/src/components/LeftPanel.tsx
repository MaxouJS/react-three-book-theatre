import { useState, type RefObject } from 'react';
import type { ThreeBook, SpriteScene } from '@objectifthunes/react-three-book-theatre';
import type { DemoParams, DirectionOption } from '../state';
import {
  PANEL_STYLE,
  SectionTitle,
  Slider,
  ColorPicker,
  Checkbox,
  Select,
} from './UiHelpers';

interface LeftPanelProps {
  params: DemoParams;
  status: string;
  bookRef: RefObject<ThreeBook | null>;
  spriteScenes: React.MutableRefObject<SpriteScene[]>;
  onParamChange: <K extends keyof DemoParams>(key: K, value: DemoParams[K], rebuild?: boolean) => void;
  onPageCountChange: (count: number) => void;
  onRebuild: () => void;
}

export default function LeftPanel({
  params,
  status,
  bookRef,
  spriteScenes,
  onParamChange,
  onPageCountChange,
  onRebuild,
}: LeftPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ ...PANEL_STYLE, left: 10 }}>
      <div style={{ marginBottom: 10 }}>
        <h1
          style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, position: 'relative', cursor: 'pointer' }}
          onClick={() => setCollapsed((c) => !c)}
        >
          react-three-book-theatre
          <span style={{
            position: 'absolute', top: 0, right: 0, width: 22, height: 22, padding: 0,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(236,242,255,0.15)',
            borderRadius: 6, color: 'rgba(236,242,255,0.68)', fontSize: 11, lineHeight: '22px',
            textAlign: 'center', display: 'inline-block',
          }}>
            {collapsed ? '\u25B8' : '\u25BE'}
          </span>
        </h1>
        <p style={{ margin: '0 0 6px', color: 'rgba(236, 242, 255, 0.82)', fontSize: 12 }}>
          Drag pages to turn. Orbit: right-click + wheel.
        </p>
        <div style={{ color: '#8cf0bf', fontWeight: 700, fontSize: 12 }}>
          {status}
        </div>
      </div>

      {collapsed ? null : <>
      {/* Page Paper */}
      <SectionTitle text="Page Paper" />

      <Slider label="Width"     min={1}     max={5}    step={0.1}   value={params.pageWidth}     onChange={(v) => onParamChange('pageWidth', v)} />
      <Slider label="Height"    min={1}     max={5}    step={0.1}   value={params.pageHeight}    onChange={(v) => onParamChange('pageHeight', v)} />
      <Slider label="Thickness" min={0.005} max={0.1}  step={0.001} value={params.pageThickness} onChange={(v) => onParamChange('pageThickness', v)} />
      <Slider label="Stiffness" min={0}     max={1}    step={0.01}  value={params.pageStiffness} onChange={(v) => onParamChange('pageStiffness', v)} />
      <Slider
        label="Count"
        min={2} max={40} step={1}
        value={params.pageCount}
        onChange={(v) => onPageCountChange(Math.max(2, Math.floor(v)))}
      />
      <ColorPicker label="Page Background" value={params.pageColor} onChange={(v) => onParamChange('pageColor', v)} />

      {/* Cover Paper */}
      <SectionTitle text="Cover Paper" />

      <Slider label="Width"     min={1}     max={5}    step={0.1}   value={params.coverWidth}     onChange={(v) => onParamChange('coverWidth', v)} />
      <Slider label="Height"    min={1}     max={5}    step={0.1}   value={params.coverHeight}    onChange={(v) => onParamChange('coverHeight', v)} />
      <Slider label="Thickness" min={0.005} max={0.15} step={0.001} value={params.coverThickness} onChange={(v) => onParamChange('coverThickness', v)} />
      <Slider label="Stiffness" min={0}     max={1}    step={0.01}  value={params.coverStiffness} onChange={(v) => onParamChange('coverStiffness', v)} />
      <ColorPicker label="Cover Color" value={params.coverColor} onChange={(v) => onParamChange('coverColor', v)} />

      {/* Book */}
      <SectionTitle text="Book" />

      <Select
        label="Direction"
        value={params.direction}
        options={[
          { value: 'left-to-right', label: 'Left to Right' },
          { value: 'right-to-left', label: 'Right to Left' },
          { value: 'up-to-down',    label: 'Up to Down' },
          { value: 'down-to-up',    label: 'Down to Up' },
        ]}
        onChange={(v) => onParamChange('direction', v as DirectionOption)}
      />

      <Slider
        label="Open Progress"
        min={0} max={1} step={0.01}
        value={params.openProgress}
        onChange={(v) => {
          onParamChange('openProgress', v, false);
          bookRef.current?.setOpenProgress(v);
        }}
      />

      <Checkbox label="Cast Shadows"       value={params.castShadows}    onChange={(v) => onParamChange('castShadows', v)} />
      <Checkbox label="Align To Ground"    value={params.alignToGround}  onChange={(v) => onParamChange('alignToGround', v)} />
      <Checkbox label="Hide Binder"        value={params.hideBinder}     onChange={(v) => onParamChange('hideBinder', v)} />
      <Checkbox label="Reduce Shadows"     value={params.reduceShadows}  onChange={(v) => onParamChange('reduceShadows', v)} />
      <Checkbox label="Reduce Sub Meshes"  value={params.reduceSubMeshes} onChange={(v) => onParamChange('reduceSubMeshes', v)} />
      <Checkbox label="Reduce Overdraw"    value={params.reduceOverdraw} onChange={(v) => onParamChange('reduceOverdraw', v)} />
      <Checkbox
        label="All Animated"
        value={params.allAnimated}
        onChange={(v) => {
          onParamChange('allAnimated', v, false);
          for (const ss of spriteScenes.current) ss.animated = v;
        }}
      />
      <Checkbox
        label="All Depth Scaling"
        value={params.allDepthScaling}
        onChange={(v) => {
          onParamChange('allDepthScaling', v, false);
          for (const ss of spriteScenes.current) ss.depthScaling = v;
        }}
      />
      <Checkbox
        label="Interactive Turning"
        value={params.interactive}
        onChange={(v) => onParamChange('interactive', v, false)}
      />

      <button
        onClick={onRebuild}
        style={{
          width: '100%',
          marginTop: 6,
          padding: 8,
          cursor: 'pointer',
          background: 'linear-gradient(135deg, #28895e 0%, #216e4c 100%)',
          color: '#f0fffa',
          border: 'none',
          borderRadius: 10,
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        Force Rebuild
      </button>

      {/* Lighting */}
      <SectionTitle text="Lighting" />

      <Slider label="Sun Intensity"     min={0} max={6}   step={0.1}  value={params.sunIntensity}     onChange={(v) => onParamChange('sunIntensity', v, false)} />
      <Slider label="Ambient Intensity" min={0} max={2}   step={0.05} value={params.ambientIntensity} onChange={(v) => onParamChange('ambientIntensity', v, false)} />
      <Slider label="Sun X"             min={-12} max={12} step={0.1} value={params.sunX}             onChange={(v) => onParamChange('sunX', v, false)} />
      <Slider label="Sun Y"             min={1}   max={20} step={0.1} value={params.sunY}             onChange={(v) => onParamChange('sunY', v, false)} />
      <Slider label="Sun Z"             min={-12} max={12} step={0.1} value={params.sunZ}             onChange={(v) => onParamChange('sunZ', v, false)} />
      </>}
    </div>
  );
}
