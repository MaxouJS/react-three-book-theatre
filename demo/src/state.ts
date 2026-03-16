import { BookDirection } from '@objectifthunes/react-three-book-theatre';
import type { ImageFitMode, SpritePlacement, ImageFit } from '@objectifthunes/react-three-book-theatre';

export type { ImageFitMode, ImageFit };

export type DirectionOption = 'left-to-right' | 'right-to-left' | 'up-to-down' | 'down-to-up';

export interface ImageSlot {
  image: HTMLImageElement | null;
  objectUrl: string | null;
  useImage: boolean;
  fitMode: ImageFitMode;
  fullBleed: boolean;
}

export interface CharacterConfig {
  placement: SpritePlacement;
  distance: number;
  intrinsicSize: number;
  animated: boolean;
  depthScaling: boolean;
  patrolRadius: number;
  idleImage: HTMLImageElement | null;
  walkImage: HTMLImageElement | null;
  actionImage: HTMLImageElement | null;
}

export interface ElementConfig {
  placement: SpritePlacement;
  distance: number;
  intrinsicSize: number;
  depthScaling: boolean;
  image: HTMLImageElement | null;
}

export interface PageConfig {
  horizonFraction: number;
  pageDistance: number;
  background: string;
  backgroundImage: HTMLImageElement | null;
  backgroundImageFit: ImageFit;
  backgroundFullBleed: boolean;
  characters: CharacterConfig[];
  elements: ElementConfig[];
}

export interface DemoParams {
  pageWidth: number;
  pageHeight: number;
  pageThickness: number;
  pageStiffness: number;
  pageCount: number;
  pageColor: string;
  coverWidth: number;
  coverHeight: number;
  coverThickness: number;
  coverStiffness: number;
  coverColor: string;
  direction: DirectionOption;
  openProgress: number;
  castShadows: boolean;
  alignToGround: boolean;
  hideBinder: boolean;
  reduceShadows: boolean;
  reduceSubMeshes: boolean;
  reduceOverdraw: boolean;
  allAnimated: boolean;
  allDepthScaling: boolean;
  interactive: boolean;
  sunIntensity: number;
  ambientIntensity: number;
  sunX: number;
  sunY: number;
  sunZ: number;
}

export const defaultParams: DemoParams = {
  pageWidth: 2,
  pageHeight: 3,
  pageThickness: 0.02,
  pageStiffness: 0.2,
  pageCount: 8,
  pageColor: '#e8d5b5',
  coverWidth: 2.1,
  coverHeight: 3.1,
  coverThickness: 0.04,
  coverStiffness: 0.5,
  coverColor: '#c04040',
  direction: 'left-to-right',
  openProgress: 0,
  castShadows: true,
  alignToGround: true,
  hideBinder: false,
  reduceShadows: false,
  reduceSubMeshes: false,
  reduceOverdraw: false,
  allAnimated: true,
  allDepthScaling: true,
  interactive: true,
  sunIntensity: 1.2,
  ambientIntensity: 0.6,
  sunX: 5,
  sunY: 10,
  sunZ: 5,
};

export const DIRECTION_TO_BOOK_DIRECTION: Record<DirectionOption, BookDirection> = {
  'left-to-right': BookDirection.LeftToRight,
  'right-to-left': BookDirection.RightToLeft,
  'up-to-down':    BookDirection.UpToDown,
  'down-to-up':    BookDirection.DownToUp,
};

export const EMPTY_SLOT: ImageSlot = {
  image: null,
  objectUrl: null,
  useImage: false,
  fitMode: 'cover',
  fullBleed: true,
};

export const DEFAULT_CHARACTER: CharacterConfig = {
  placement: 'ground',
  distance: 5,
  intrinsicSize: 100,
  animated: true,
  depthScaling: true,
  patrolRadius: 10,
  idleImage: null,
  walkImage: null,
  actionImage: null,
};

export const DEFAULT_ELEMENT: ElementConfig = {
  placement: 'ground',
  distance: 5,
  intrinsicSize: 100,
  depthScaling: true,
  image: null,
};

export function createDefaultPageConfig(): PageConfig {
  return {
    horizonFraction: 0.40,
    pageDistance: 10,
    background: '#e8d5b5',
    backgroundImage: null,
    backgroundImageFit: 'cover',
    backgroundFullBleed: true,
    characters: [
      { ...DEFAULT_CHARACTER },
      { ...DEFAULT_CHARACTER },
      { ...DEFAULT_CHARACTER },
    ],
    elements: [],
  };
}
