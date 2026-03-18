// ─────────────────────────────────────────────────────────────────────────────
// @objectifthunes/react-three-book-theatre
//
// R3F integration for three-book-theatre.  The theatre core (SpriteScene,
// Sprite, Element, perspective helpers) is embedded natively in src/core/.
//
// New Components
//   <SpriteSceneUpdater>  — drives per-frame scene.update(dt, book) inside <Book>
//
// New Hooks
//   useSpriteScene()      — create + manage a single SpriteScene
//   useSpriteScenes()     — create + manage multiple SpriteScenes (one per page)
//
// Re-exports everything from react-three-book so consumers only need a
// single import.
// ─────────────────────────────────────────────────────────────────────────────

// ── New R3F components ──────────────────────────────────────────────────────
export { SpriteSceneUpdater } from './SpriteSceneUpdater';
export type { SpriteSceneUpdaterProps } from './SpriteSceneUpdater';

// ── New hooks ───────────────────────────────────────────────────────────────
export { useSpriteScene } from './hooks/useSpriteScene';
export { useSpriteScenes } from './hooks/useSpriteScenes';

// ── Core: three-book-theatre (embedded) ─────────────────────────────────────
export { drawImageFit } from './core/canvas-utils';
export type { ImageFit } from './core/canvas-utils';

export { Positionable } from './core/Positionable';
export type { SpritePlacement } from './core/Positionable';

export { Sprite } from './core/Sprite';
export type { SpriteState, SpriteOptions } from './core/Sprite';

export { Element } from './core/Element';
export type { ElementOptions } from './core/Element';

export { SpriteScene } from './core/SpriteScene';
export type { SpriteSceneOptions, SpriteUpdateOptions, ElementUpdateOptions } from './core/SpriteScene';

export { SpriteSpreadScene } from './core/SpriteSpreadScene';
export type { SpriteSpreadSceneOptions, SpreadHalf } from './core/SpriteSpreadScene';

export { groundR, skyR, depthScale, renderedSize } from './core/perspective';

// ── Re-export: react-three-book (full API) ──────────────────────────────────
export {
  // Components
  Book,
  BookInteraction,
  // Context
  BookContext,
  useBook,
  useRequiredBook,
  // Hooks
  useBookRef,
  usePageTurning,
  useBookControls,
  useAutoTurn,
  useBookState,
  useBookContent,
  // Texture utilities
  drawImageWithFit,
  createPageTexture,
  loadImage,
  // Core library
  ThreeBook,
  BookHeightException,
  BookContent,
  BookDirection,
  BookBinding,
  BookBound,
  StapleBookBound,
  StapleBookBinding,
  StapleSetup,
  Paper,
  PaperSetup,
  PaperUVMargin,
  PaperMeshData,
  PaperMaterialData,
  PaperPattern,
  PaperNode,
  PaperSeam,
  PaperBorder,
  PaperNodeMargin,
  Cylinder,
  AutoTurnDirection,
  AutoTurnMode,
  AutoTurnSettings,
  AutoTurnSetting,
  AutoTurnSettingMode,
  AutoTurnSettingCurveTimeMode,
  AnimationCurve,
  BookRenderer,
  RendererFactory,
  MeshFactory,
  PaperMeshDataPool,
  PageContent,
  SpritePageContent2,
  SpreadContent,
  getSpreadPairs,
} from '@objectifthunes/react-three-book';

export type {
  BookProps,
  BookInteractionProps,
  UseBookRefResult,
  UsePageTurningOptions,
  BookControls,
  AutoTurnControls,
  BookState,
  ImageFitMode,
  LoadedImage,
  BookOptions,
  BookRaycastHit,
  PaperSetupInit,
  Keyframe,
  IPageContent,
  SpreadContentOptions,
} from '@objectifthunes/react-three-book';
